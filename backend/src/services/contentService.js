const { badRequest } = require('../utils/http')
const { ensureRequiredString } = require('../utils/validation')

const CONTENT_TYPES = ['ebook', 'video']

function normalizeTags(rawTags) {
  if (Array.isArray(rawTags)) {
    return rawTags.map((tag) => ensureRequiredString(tag)).filter(Boolean).slice(0, 10)
  }
  const text = ensureRequiredString(rawTags)
  if (!text) return []
  return text
    .split(',')
    .map((tag) => ensureRequiredString(tag))
    .filter(Boolean)
    .slice(0, 10)
}

function ensureContentType(value) {
  const type = ensureRequiredString(value).toLowerCase()
  if (!CONTENT_TYPES.includes(type)) {
    throw badRequest('type must be ebook or video.')
  }
  return type
}

function normalizeSortOrder(value, fallback = 100) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(0, Math.round(parsed))
}

function toContentList(db, { includeUnpublished = true, type = '', mandirId = '', includeAllScopes = false } = {}) {
  const normalizedType = ensureRequiredString(type).toLowerCase()
  const normalizedMandirId = ensureRequiredString(mandirId)
  return (db.contentLibrary || [])
    .filter((item) => (normalizedType ? item.type === normalizedType : true))
    .filter((item) => (includeUnpublished ? true : item.isPublished))
    .filter((item) => {
      if (includeAllScopes) return true
      if (item.scope === 'global') return true
      if (!normalizedMandirId) return !item.mandirId
      return ensureRequiredString(item.mandirId) === normalizedMandirId
    })
    .sort((a, b) => {
      const orderDelta = (a.sortOrder || 0) - (b.sortOrder || 0)
      if (orderDelta) return orderDelta
      return String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''))
    })
}

module.exports = {
  CONTENT_TYPES,
  normalizeTags,
  ensureContentType,
  normalizeSortOrder,
  toContentList,
}
