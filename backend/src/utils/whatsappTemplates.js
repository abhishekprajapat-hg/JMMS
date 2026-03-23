const META_SAMPLE_TEMPLATE_NAMES = new Set(['hello_world'])

function normalizeTemplateName(value) {
  return String(value || '').trim().toLowerCase()
}

function isPlaceholderMetaTemplateName(value) {
  return META_SAMPLE_TEMPLATE_NAMES.has(normalizeTemplateName(value))
}

module.exports = {
  isPlaceholderMetaTemplateName,
}
