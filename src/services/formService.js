const mongoose = require("mongoose");
const { Form } = require("../models/Form");
const { FormHistory } = require("../models/FormHistory");
const { AppError } = require("../utils/appError");
const { sanitizeFormPayload } = require("../utils/formSanitizer");
const { slugify } = require("../utils/slugify");

function canAccessForm(form, userId) {
  const normalizedUserId = userId.toString();
  return (
    form.ownerId.toString() === normalizedUserId ||
    form.collaborators.some((collaboratorId) => collaboratorId.toString() === normalizedUserId)
  );
}

async function ensureUniqueSlug(baseSlug, ignoreFormId = null) {
  const seed = slugify(baseSlug) || "untitled-form";
  let candidate = seed;
  let suffix = 1;

  while (true) {
    const existing = await Form.findOne({
      slug: candidate,
      ...(ignoreFormId ? { _id: { $ne: ignoreFormId } } : {})
    }).lean();

    if (!existing) {
      return candidate;
    }

    suffix += 1;
    candidate = `${seed}-${suffix}`;
  }
}

async function createForm(ownerId, payload) {
  const sanitized = sanitizeFormPayload(payload);
  const slug = await ensureUniqueSlug(sanitized.slug || sanitized.title);

  const form = await Form.create({
    ...sanitized,
    slug,
    ownerId,
    collaborators: sanitized.collaborators.filter(Boolean)
  });

  return form;
}

async function getAccessibleForm(formId, userId) {
  if (!mongoose.Types.ObjectId.isValid(formId)) {
    throw new AppError(404, "Form not found");
  }

  const form = await Form.findById(formId);
  if (!form) {
    throw new AppError(404, "Form not found");
  }
  if (!canAccessForm(form, userId)) {
    throw new AppError(403, "You do not have access to this form");
  }

  return form;
}

async function updateForm(form, actorId, payload) {
  await FormHistory.create({
    formId: form._id,
    version: form.version,
    snapshot: form.toObject(),
    actorId
  });

  const sanitized = sanitizeFormPayload(payload);
  const slug = await ensureUniqueSlug(sanitized.slug || form.slug || form.title, form._id);

  form.title = sanitized.title || form.title;
  form.slug = slug;
  form.collaborators = sanitized.collaborators.filter(Boolean);
  form.theme = sanitized.theme;
  form.fields = sanitized.fields;
  form.version += 1;

  await form.save();
  return form;
}

async function restoreForm(form, historyId, actorId) {
  const history = await FormHistory.findOne({ _id: historyId, formId: form._id });
  if (!history) {
    throw new AppError(404, "History entry not found");
  }

  await FormHistory.create({
    formId: form._id,
    version: form.version,
    snapshot: form.toObject(),
    actorId
  });

  const snapshot = history.snapshot;
  form.title = snapshot.title;
  form.slug = await ensureUniqueSlug(snapshot.slug || form.slug, form._id);
  form.collaborators = snapshot.collaborators || [];
  form.theme = snapshot.theme || { preset: "minimal", custom_css: "" };
  form.fields = snapshot.fields || [];
  form.version += 1;

  await form.save();
  return { form, history };
}

module.exports = {
  canAccessForm,
  createForm,
  getAccessibleForm,
  restoreForm,
  updateForm
};
