const { AppError } = require("../utils/appError");
const { buildLogicState } = require("./logicEngine");

function normalizeSubmissionAnswers(form, answers = {}) {
  const normalized = { ...answers };

  for (const field of form.fields || []) {
    const answer = normalized[field.id];

    if (answer === undefined || answer === null || answer === "") {
      continue;
    }

    if ((field.type === "number" || field.type === "rating") && typeof answer === "string") {
      const numericValue = Number(answer);
      normalized[field.id] = Number.isNaN(numericValue) ? answer : numericValue;
    }
  }

  return normalized;
}

function validateRequired(answer, field) {
  if (!field.validation?.required) {
    return null;
  }

  const empty =
    answer === undefined ||
    answer === null ||
    answer === "" ||
    (Array.isArray(answer) && answer.length === 0);

  return empty ? field.validation.error_message || `${field.label} is required` : null;
}

function validateByType(answer, field) {
  if (answer === undefined || answer === null || answer === "") {
    return null;
  }

  const config = field.config || {};
  const options = Array.isArray(config.options)
    ? config.options.map((option) => (typeof option === "string" ? option : option.value))
    : [];
  const normalizedAllowedTypes = Array.isArray(config.allowed_types)
    ? config.allowed_types
      .map((type) => String(type).replace(/^\./, "").trim().toLowerCase())
      .filter(Boolean)
    : [];

  switch (field.type) {
    case "short_text":
    case "long_text":
      if (typeof answer !== "string") {
        return `Enter text for ${field.label.toLowerCase()}`;
      }
      if (config.max_length && answer.length > config.max_length) {
        return `${field.label} must be ${config.max_length} characters or fewer`;
      }
      return null;
    case "email":
      if (typeof answer !== "string") {
        return `Enter a valid email address for ${field.label.toLowerCase()}`;
      }
      if (config.validate_format !== false) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(answer)) {
          return `Enter a valid email address, like name@example.com`;
        }
      }
      return null;
    case "phone":
      if (typeof answer !== "string") {
        return `Enter a valid phone number for ${field.label.toLowerCase()}`;
      }
      if (config.validate_format !== false) {
        const phonePattern = /^[0-9+\-() ]{7,20}$/;
        if (!phonePattern.test(answer)) {
          return `Enter a valid phone number with digits and optional +, -, spaces, or parentheses`;
        }
      }
      return null;
    case "multi_select":
      if (!Array.isArray(answer)) {
        return `Choose one or more options for ${field.label.toLowerCase()}`;
      }
      if (config.min_select && answer.length < config.min_select) {
        return `Select at least ${config.min_select} option${config.min_select > 1 ? "s" : ""} for ${field.label}`;
      }
      if (config.max_select && answer.length > config.max_select) {
        return `Select no more than ${config.max_select} options for ${field.label}`;
      }
      if (options.length && answer.some((value) => !options.includes(value))) {
        return `Choose only the listed options for ${field.label}`;
      }
      return null;
    case "single_select":
      if (typeof answer !== "string") {
        return `Choose an option for ${field.label}`;
      }
      if (options.length && !options.includes(answer)) {
        return `Choose a valid option for ${field.label}`;
      }
      return null;
    case "date_range":
      if (!Array.isArray(answer) || answer.length !== 2) {
        return `Select both a start date and an end date for ${field.label}`;
      }
      return null;
    case "file_upload":
      if (
        typeof answer !== "object" ||
        Array.isArray(answer) ||
        !answer.url ||
        !answer.cloudinary_public_id
      ) {
        return `Upload a valid file for ${field.label}`;
      }
      if (
        config.max_size_mb &&
        typeof answer.size_bytes === "number" &&
        answer.size_bytes > Number(config.max_size_mb) * 1024 * 1024
      ) {
        return `${field.label} must be smaller than ${config.max_size_mb} MB`;
      }
      if (normalizedAllowedTypes.length) {
        const uploadedType = String(answer.format || "")
          .replace(/^\./, "")
          .toLowerCase();
        if (uploadedType && !normalizedAllowedTypes.includes(uploadedType)) {
          return `${field.label} must be one of: ${normalizedAllowedTypes.join(", ")}`;
        }
      }
      return null;
    case "rating":
      if (typeof answer !== "number") {
        return `Choose a rating for ${field.label}`;
      }
      if (config.max_stars && answer > config.max_stars) {
        return `${field.label} cannot be higher than ${config.max_stars}`;
      }
      if (answer < 1) {
        return `${field.label} must be at least 1`;
      }
      return null;
    case "number":
      if (typeof answer !== "number") {
        return `Enter a number for ${field.label}`;
      }
      if (config.min !== undefined && answer < config.min) {
        return `${field.label} must be at least ${config.min}`;
      }
      if (config.max !== undefined && answer > config.max) {
        return `${field.label} must be at most ${config.max}`;
      }
      return null;
    default:
      return null;
  }
}

function validateSubmission(form, answers) {
  const errors = {};
  const normalizedAnswers = normalizeSubmissionAnswers(form, answers);
  const logicState = buildLogicState(form, normalizedAnswers);
  const hiddenSet = new Set(logicState.hiddenFieldIds);

  for (const field of form.fields) {
    if (hiddenSet.has(field.id)) {
      continue;
    }

    const answer = normalizedAnswers[field.id];
    const requiredError = validateRequired(answer, field);
    if (requiredError) {
      errors[field.id] = requiredError;
      continue;
    }

    const typeError = validateByType(answer, field);
    if (typeError) {
      errors[field.id] = typeError;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    logicState,
    normalizedAnswers
  };
}

function assertValidSubmission(form, answers) {
  const result = validateSubmission(form, answers);
  if (!result.isValid) {
    throw new AppError(400, "Please review the highlighted fields and try again.", result);
  }
  return result;
}

module.exports = {
  assertValidSubmission,
  normalizeSubmissionAnswers,
  validateSubmission
};
