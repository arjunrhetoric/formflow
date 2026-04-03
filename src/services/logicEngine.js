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

  switch (condition.op) {
    case "equals":
      return answer === condition.value;
    case "not_equals":
      return answer !== condition.value;
    case "contains":
      return typeof answer === "string" && answer.includes(condition.value);
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
      return (
        Array.isArray(answer) &&
        Array.isArray(condition.value) &&
        condition.value.some((value) => answer.includes(value))
      );
    default:
      return false;
  }
}

function buildLogicState(form, answers) {
  const hiddenFieldIds = new Set();
  let jumpTo = null;

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
