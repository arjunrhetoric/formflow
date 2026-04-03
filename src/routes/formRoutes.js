const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");
const { AppError } = require("../utils/appError");
const { Form } = require("../models/Form");
const { User } = require("../models/User");
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

/* ───── Collaborator management ───── */

// List collaborators with user details
router.get(
  "/:id/collaborators",
  asyncHandler(async (req, res) => {
    const form = await getAccessibleForm(req.params.id, req.user._id);

    if (!form.shareToken) {
      form.shareToken = require("../models/Form").generateShareToken();
      await form.save();
    }

    const populated = await Form.findById(form._id)
      .populate("collaborators", "name email cursorColor avatar_url")
      .lean();

    const owner = await User.findById(form.ownerId)
      .select("name email cursorColor avatar_url")
      .lean();

    res.json({
      owner: owner ? {
        _id: owner._id,
        name: owner.name,
        email: owner.email,
        cursorColor: owner.cursorColor,
        avatar_url: owner.avatar_url,
        role: "owner"
      } : null,
      collaborators: (populated?.collaborators || []).map((c) => ({
        _id: c._id,
        name: c.name,
        email: c.email,
        cursorColor: c.cursorColor,
        avatar_url: c.avatar_url,
        role: "collaborator"
      })),
      shareToken: form.shareToken,
      requireSignupToSubmit: form.requireSignupToSubmit || false
    });
  })
);

// Add a collaborator by email
router.post(
  "/:id/collaborators",
  asyncHandler(async (req, res) => {
    const form = await getAccessibleForm(req.params.id, req.user._id);
    const { email } = req.body;

    if (!email) {
      throw new AppError(400, "email is required");
    }

    const userToAdd = await User.findOne({ email: email.toLowerCase().trim() });
    if (!userToAdd) {
      throw new AppError(404, "No user found with that email. They need to sign up first.");
    }

    if (form.ownerId.toString() === userToAdd._id.toString()) {
      throw new AppError(400, "This user is already the owner of the form");
    }

    if (form.collaborators.some((c) => c.toString() === userToAdd._id.toString())) {
      throw new AppError(409, "This user is already a collaborator");
    }

    form.collaborators.push(userToAdd._id);
    await form.save();

    res.json({
      collaborator: {
        _id: userToAdd._id,
        name: userToAdd.name,
        email: userToAdd.email,
        cursorColor: userToAdd.cursorColor,
        avatar_url: userToAdd.avatar_url,
        role: "collaborator"
      }
    });
  })
);

// Remove a collaborator
router.delete(
  "/:id/collaborators/:userId",
  asyncHandler(async (req, res) => {
    const form = await getAccessibleForm(req.params.id, req.user._id);

    // Only the owner can remove collaborators
    if (form.ownerId.toString() !== req.user._id.toString()) {
      throw new AppError(403, "Only the form owner can remove collaborators");
    }

    form.collaborators = form.collaborators.filter(
      (c) => c.toString() !== req.params.userId
    );
    await form.save();
    res.status(204).send();
  })
);

// Join form via share token (auto-add as collaborator)
router.post(
  "/join/:shareToken",
  asyncHandler(async (req, res) => {
    const form = await Form.findOne({ shareToken: req.params.shareToken });
    if (!form) {
      throw new AppError(404, "Invalid or expired invite link");
    }

    const userId = req.user._id.toString();

    if (form.ownerId.toString() === userId) {
      return res.json({ form: { _id: form._id, title: form.title }, alreadyMember: true });
    }

    if (form.collaborators.some((c) => c.toString() === userId)) {
      return res.json({ form: { _id: form._id, title: form.title }, alreadyMember: true });
    }

    form.collaborators.push(req.user._id);
    await form.save();

    res.json({
      form: { _id: form._id, title: form.title },
      alreadyMember: false,
      message: "You have been added as a collaborator"
    });
  })
);

// Regenerate share token
router.post(
  "/:id/regenerate-token",
  asyncHandler(async (req, res) => {
    const form = await getAccessibleForm(req.params.id, req.user._id);

    if (form.ownerId.toString() !== req.user._id.toString()) {
      throw new AppError(403, "Only the form owner can regenerate the share token");
    }

    form.shareToken = require("../models/Form").generateShareToken();
    await form.save();

    res.json({ shareToken: form.shareToken });
  })
);

// Toggle requireSignupToSubmit
router.patch(
  "/:id/settings",
  asyncHandler(async (req, res) => {
    const form = await getAccessibleForm(req.params.id, req.user._id);

    if (req.body.requireSignupToSubmit !== undefined) {
      form.requireSignupToSubmit = !!req.body.requireSignupToSubmit;
    }

    await form.save();
    res.json({ form });
  })
);

module.exports = router;

