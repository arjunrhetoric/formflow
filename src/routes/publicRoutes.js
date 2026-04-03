const express = require("express");
const { Form } = require("../models/Form");
const { Response } = require("../models/Response");
const { asyncHandler } = require("../utils/asyncHandler");
const { AppError } = require("../utils/appError");
const { assertValidSubmission, validateSubmission } = require("../services/validationService");
const { submitLimiter } = require("../middleware/rateLimit");

const router = express.Router();

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
        fields: form.fields
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

    const answers = req.body.answers || {};
    const validationResult = assertValidSubmission(form, answers);

    const response = await Response.create({
      formId: form._id,
      formVersion: form.version,
      submittedBy: req.body.submittedBy || "anon",
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
