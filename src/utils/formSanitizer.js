function sanitizeField(field, index) {
  return {
    id: field.id,
    type: field.type,
    order: field.order ?? index + 1,
    label: field.label,
    config: field.config || {},
    validation: field.validation || {},
    logic: Array.isArray(field.logic) ? field.logic : []
  };
}

function sanitizeFormPayload(payload) {
  return {
    title: payload.title,
    slug: payload.slug,
    collaborators: Array.isArray(payload.collaborators) ? payload.collaborators : [],
    theme: {
      preset: payload.theme?.preset || "minimal",
      custom_css: payload.theme?.custom_css || ""
    },
    requireSignupToSubmit: !!payload.requireSignupToSubmit,
    allowMultipleResponses: !!payload.allowMultipleResponses,
    fields: Array.isArray(payload.fields)
      ? payload.fields.map((field, index) => sanitizeField(field, index))
      : []
  };
}

module.exports = { sanitizeFormPayload };
