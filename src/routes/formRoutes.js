const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");
const { AppError } = require("../utils/appError");
const { Form } = require("../models/Form");
const { Response } = require("../models/Response");
const { FormHistory } = require("../models/FormHistory");
const { createForm, getAccessibleForm, restoreForm, updateForm } = require("../services/formService");
const { toCsv } = require("../utils/csv");

const router = express.Router();

router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const forms = await Form.find({
      $or: [{ ownerId: req.user._id }, { collaborators: req.user._id }]
    }).sort({ updatedAt: -1 }).lean();

    // Aggregate response counts for all forms
    const formIds = forms.map((f) => f._id);
    const counts = await Response.aggregate([
      { $match: { formId: { $in: formIds } } },
      { $group: { _id: "$formId", count: { $sum: 1 } } }
    ]);
    const countMap = {};
    counts.forEach((c) => { countMap[c._id.toString()] = c.count; });

    const formsWithCounts = forms.map((f) => ({
      ...f,
      responseCount: countMap[f._id.toString()] || 0
    }));

    res.json({ forms: formsWithCounts });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    if (!req.body.title) {
      throw new AppError(400, "title is required");
    }

    const form = await createForm(req.user._id, req.body);
    res.status(201).json({ form });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const form = await getAccessibleForm(req.params.id, req.user._id);
    const history = await FormHistory.find({ formId: form._id })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ form, history });
  })
);

router.get(
  "/:id/history",
  asyncHandler(async (req, res) => {
    const form = await getAccessibleForm(req.params.id, req.user._id);
    const history = await FormHistory.find({ formId: form._id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ history });
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const form = await getAccessibleForm(req.params.id, req.user._id);
    const updatedForm = await updateForm(form, req.user._id, req.body);
    res.json({ form: updatedForm });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const form = await getAccessibleForm(req.params.id, req.user._id);
    await FormHistory.deleteMany({ formId: form._id });
    await Response.deleteMany({ formId: form._id });
    await form.deleteOne();
    res.status(204).send();
  })
);

router.post(
  "/:id/restore/:historyId",
  asyncHandler(async (req, res) => {
    const form = await getAccessibleForm(req.params.id, req.user._id);
    const result = await restoreForm(form, req.params.historyId, req.user._id);
    res.json(result);
  })
);

router.get(
  "/:id/responses",
  asyncHandler(async (req, res) => {
    const form = await getAccessibleForm(req.params.id, req.user._id);
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [responses, total] = await Promise.all([
      Response.find({ formId: form._id }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Response.countDocuments({ formId: form._id })
    ]);

    res.json({ responses, total, page, limit, pages: Math.ceil(total / limit) });
  })
);

router.get(
  "/:id/export.csv",
  asyncHandler(async (req, res) => {
    const form = await getAccessibleForm(req.params.id, req.user._id);
    const responses = await Response.find({ formId: form._id }).sort({ createdAt: -1 }).lean();
    const rows = responses.map((response) => ({
      response_id: response._id.toString(),
      submitted_by:
        typeof response.submittedBy === "object" && response.submittedBy !== null
          ? response.submittedBy.toString()
          : response.submittedBy,
      form_version: response.formVersion || "",
      completion_time: response.respondentMeta?.completionTime || "",
      created_at: response.createdAt,
      ...response.answers
    }));

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${form.slug || form._id.toString()}-responses.csv"`
    );
    res.send(toCsv(rows));
  })
);

router.get(
  "/:id/export.json",
  asyncHandler(async (req, res) => {
    const form = await getAccessibleForm(req.params.id, req.user._id);
    const responses = await Response.find({ formId: form._id }).sort({ createdAt: -1 }).lean();

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${form.slug || form._id.toString()}-responses.json"`
    );
    res.json({ formId: form._id, responses });
  })
);

router.get(
  "/:id/analytics",
  asyncHandler(async (req, res) => {
    const form = await getAccessibleForm(req.params.id, req.user._id);
    const responses = await Response.find({ formId: form._id }).lean();

    const completionTimes = responses
      .map((r) => r.respondentMeta?.completionTime)
      .filter((t) => t > 0);
    const avgCompletionTime = completionTimes.length
      ? Math.round(completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length)
      : 0;

    const summary = form.fields.map((field) => {
      const values = responses
        .map((response) => response.answers?.[field.id])
        .filter((value) => value !== undefined);

      return {
        fieldId: field.id,
        label: field.label,
        type: field.type,
        responseCount: values.length,
        sample: values.slice(0, 5)
      };
    });

    res.json({
      totalResponses: responses.length,
      avgCompletionTime,
      fields: summary
    });
  })
);

module.exports = router;
