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
        requireSignupToSubmit: form.requireSignupToSubmit || false
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

    const answers = req.body.answers || {};
    const validationResult = assertValidSubmission(form, answers);

    const response = await Response.create({
      formId: form._id,
      formVersion: form.version,
      submittedBy,
      answers,
      respondentMeta: {
        ip: req.ip || "",
        userAgent: req.headers["user-agent"] || "",
        completionTime: Number(req.body.completionTime) || 0
      }
    });

    res.status(201).json({
      response,
      logicState: validationResult.logicState
    });
  })
);

module.exports = router;

