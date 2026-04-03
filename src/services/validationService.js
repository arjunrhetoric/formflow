const { AppError } = require("../utils/appError");
const { buildLogicState } = require("./logicEngine");

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

  switch (field.type) {
    case "short_text":
    case "long_text":
      if (typeof answer !== "string") {
        return `${field.label} must be text`;
      }
      if (config.max_length && answer.length > config.max_length) {
        return `${field.label} exceeds max length`;
      }
      return null;
    case "email":
      if (typeof answer !== "string") {
        return `${field.label} must be text`;
      }
      if (config.validate_format !== false) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(answer)) {
          return `${field.label} must be a valid email`;
        }
      }
      return null;
    case "phone":
      if (typeof answer !== "string") {
        return `${field.label} must be text`;
      }
      if (config.validate_format !== false) {
        const phonePattern = /^[0-9+\-() ]{7,20}$/;
        if (!phonePattern.test(answer)) {
          return `${field.label} must be a valid phone number`;
        }
      }
      return null;
    case "multi_select":
      if (!Array.isArray(answer)) {
        return `${field.label} must be an array`;
      }
      if (config.min_select && answer.length < config.min_select) {
        return `${field.label} requires at least ${config.min_select} selections`;
      }
      if (config.max_select && answer.length > config.max_select) {
        return `${field.label} allows at most ${config.max_select} selections`;
      }
      return null;
    case "single_select":
      if (typeof answer !== "string") {
        return `${field.label} must be a single selected value`;
      }
      return null;
    case "date_range":
      if (!Array.isArray(answer) || answer.length !== 2) {
        return `${field.label} must include a start and end date`;
      }
      return null;
    case "file_upload":
      if (typeof answer !== "object" || Array.isArray(answer)) {
        return `${field.label} must be a file object`;
      }
      return null;
    case "rating":
      if (typeof answer !== "number") {
        return `${field.label} must be a number`;
      }
      if (config.max_stars && answer > config.max_stars) {
        return `${field.label} exceeds max rating`;
      }
      return null;
    case "number":
      if (typeof answer !== "number") {
        return `${field.label} must be numeric`;
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
  const logicState = buildLogicState(form, answers);
  const hiddenSet = new Set(logicState.hiddenFieldIds);

  for (const field of form.fields) {
    if (hiddenSet.has(field.id)) {
      continue;
    }

    const answer = answers[field.id];
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
    logicState
  };
}

function assertValidSubmission(form, answers) {
  const result = validateSubmission(form, answers);
  if (!result.isValid) {
    throw new AppError(400, "Submission validation failed", result);
  }
  return result;
}

module.exports = {
  assertValidSubmission,
  validateSubmission
};
