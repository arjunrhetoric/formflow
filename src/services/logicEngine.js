function normalizeComparable(value) {
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value === "string") {
    const asDate = Date.parse(value);
    return Number.isNaN(asDate) ? value : asDate;
  }
  return value;
}

function evaluateCondition(answer, condition) {
  const comparableAnswer = normalizeComparable(answer);
  const comparableValue = normalizeComparable(condition.value);
  const answerIsArray = Array.isArray(answer);
  const conditionIsArray = Array.isArray(condition.value);

  switch (condition.op) {
    case "equals":
      if (answerIsArray) {
        if (conditionIsArray) {
          return (
            answer.length === condition.value.length &&
            condition.value.every((value) => answer.includes(value))
          );
        }
        return answer.includes(condition.value);
      }
      return answer === condition.value;
    case "not_equals":
      if (answerIsArray) {
        if (conditionIsArray) {
          return !(
            answer.length === condition.value.length &&
            condition.value.every((value) => answer.includes(value))
          );
        }
        return !answer.includes(condition.value);
      }
      return answer !== condition.value;
    case "contains":
      if (typeof answer === "string") {
        return answer.includes(String(condition.value ?? ""));
      }
      if (answerIsArray) {
        if (conditionIsArray) {
          return condition.value.every((value) => answer.includes(value));
        }
        return answer.includes(condition.value);
      }
      return false;
    case "starts_with":
      return typeof answer === "string" && answer.startsWith(condition.value);
    case "gt":
      return comparableAnswer > comparableValue;
    case "gte":
      return comparableAnswer >= comparableValue;
    case "lt":
      return comparableAnswer < comparableValue;
    case "lte":
      return comparableAnswer <= comparableValue;
    case "is_empty":
      return (
        answer === undefined ||
        answer === null ||
        answer === "" ||
        (Array.isArray(answer) && answer.length === 0)
      );
    case "in_list":
      if (!conditionIsArray) {
        return false;
      }
      if (answerIsArray) {
        return condition.value.some((value) => answer.includes(value));
      }
      return condition.value.includes(answer);
    default:
      return false;
  }
}

function buildLogicState(form, answers) {
  const hiddenFieldIds = new Set();
  let jumpTo = null;

  // Targets of "show" rules start hidden until a matching rule reveals them.
  for (const field of form.fields) {
    for (const rule of field.logic || []) {
      if (rule.action.type === "show") {
        (rule.action.targets || []).forEach((target) => hiddenFieldIds.add(target));
      }
    }
  }

  for (const field of form.fields) {
    for (const rule of field.logic || []) {
      const referenceFieldId = rule.condition.field === "self" ? field.id : rule.condition.field;
      const answer = answers[referenceFieldId];

      if (!evaluateCondition(answer, rule.condition)) {
        continue;
      }

      if (rule.action.type === "hide") {
        (rule.action.targets || []).forEach((target) => hiddenFieldIds.add(target));
      }

      if (rule.action.type === "show") {
        (rule.action.targets || []).forEach((target) => hiddenFieldIds.delete(target));
      }

      if (rule.action.type === "jump") {
        jumpTo = rule.action.destination || null;
      }
    }
  }

  return {
    hiddenFieldIds: Array.from(hiddenFieldIds),
    jumpTo
  };
}

module.exports = {
  buildLogicState,
  evaluateCondition
};
