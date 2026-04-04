const express = require("express");
const jwt = require("jsonwebtoken");
const { Form } = require("../models/Form");
const { User } = require("../models/User");
const { Response } = require("../models/Response");
const { asyncHandler } = require("../utils/asyncHandler");
const { AppError } = require("../utils/appError");
const { assertValidSubmission, validateSubmission } = require("../services/validationService");
const { submitLimiter } = require("../middleware/rateLimit");
const { env } = require("../config/env");

const router = express.Router();

// Helper: optionally extract user from JWT (doesn't reject if missing)
function optionalAuth(req) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) return null;
    const payload = jwt.verify(header.split(" ")[1], env.JWT_SECRET);
    return payload.sub || null;
  } catch { return null; }
}

function getClientIp(req) {
  const candidates = [
    req.headers["cf-connecting-ip"],
    req.headers["x-real-ip"],
    req.headers["x-forwarded-for"],
    req.ip,
    req.socket?.remoteAddress
  ];

  for (const candidate of candidates) {
    const rawValue = Array.isArray(candidate)
      ? candidate[0]
      : typeof candidate === "string"
        ? candidate.split(",")[0]
        : candidate;

    let normalized = String(rawValue || "")
      .replace(/^::ffff:/, "")
      .trim()
      .toLowerCase();

    // Some proxies include port in forwarded IP values (e.g. "1.2.3.4:5678").
    if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(normalized)) {
      normalized = normalized.split(":")[0];
    }

    if (!normalized) {
      continue;
    }

    if (["::1", "127.0.0.1", "localhost", "::ffff:127.0.0.1"].includes(normalized)) {
      return "local";
    }

    return normalized;
  }

  return "";
}

function isDuplicateIpSubmissionError(err) {
  return (
    err?.code === 11000 &&
    Object.prototype.hasOwnProperty.call(err?.keyPattern || {}, "formId") &&
    Object.prototype.hasOwnProperty.call(err?.keyPattern || {}, "respondentMeta.ip") &&
    Object.prototype.hasOwnProperty.call(err?.keyPattern || {}, "onePerIpEnforced")
  );
}

router.get(
  "/forms/:slug",
  asyncHandler(async (req, res) => {
    const form = await Form.findOne({ slug: req.params.slug }).lean();
    if (!form) {
      throw new AppError(404, "Public form not found");
    }

    res.json({
      form: {
        _id: form._id,
        slug: form.slug,
        title: form.title,
        version: form.version,
        theme: form.theme,
        fields: form.fields,
        requireSignupToSubmit: form.requireSignupToSubmit || false,
        allowMultipleResponses: form.allowMultipleResponses || false
      }
    });
  })
);

router.post(
  "/forms/:slug/validate",
  submitLimiter,
  asyncHandler(async (req, res) => {
    const form = await Form.findOne({ slug: req.params.slug });
    if (!form) {
      throw new AppError(404, "Public form not found");
    }

    const result = validateSubmission(form, req.body.answers || {});
    res.json(result);
  })
);

router.post(
  "/forms/:slug/submit",
  submitLimiter,
  asyncHandler(async (req, res) => {
    const form = await Form.findOne({ slug: req.params.slug });
    if (!form) {
      throw new AppError(404, "Public form not found");
    }

    // Check if signup is required
    let submittedBy = "anon";
    if (form.requireSignupToSubmit) {
      const userId = optionalAuth(req);
      if (!userId) {
        throw new AppError(401, "You must sign up or log in to submit this form");
      }
      submittedBy = userId;
    } else {
      const userId = optionalAuth(req);
      if (userId) submittedBy = userId;
    }

    const clientIp = getClientIp(req);
    const existingResponse = !form.allowMultipleResponses && clientIp
      ? await Response.findOne({
          formId: form._id,
          "respondentMeta.ip": clientIp
        }).lean()
      : null;

    if (existingResponse) {
      throw new AppError(409, "This form has already been submitted from this network.", {
        errors: {
          _form: "A response from this network has already been recorded for this form. If you think this is a mistake, contact the form owner."
        }
      });
    }

    const answers = req.body.answers || {};
    const validationResult = assertValidSubmission(form, answers);

    let response;
    try {
      response = await Response.create({
        formId: form._id,
        formVersion: form.version,
        submittedBy,
        answers: validationResult.normalizedAnswers,
        respondentMeta: {
          ip: clientIp,
          userAgent: req.headers["user-agent"] || "",
          completionTime: Number(req.body.completionTime) || 0
        },
        onePerIpEnforced: !form.allowMultipleResponses && !!clientIp
      });
    } catch (err) {
      if (isDuplicateIpSubmissionError(err)) {
        throw new AppError(409, "This form has already been submitted from this network.", {
          errors: {
            _form: "A response from this network has already been recorded for this form. If you think this is a mistake, contact the form owner."
          }
        });
      }
      throw err;
    }

    res.status(201).json({
      response,
      logicState: validationResult.logicState
    });
  })
);

module.exports = router;

