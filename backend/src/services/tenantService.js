const { DEFAULT_MANDIR_ID } = require('../constants/tenant')
const { badRequest } = require('../utils/http')
const { ensureRequiredString } = require('../utils/validation')

const TENANT_COLLECTION_KEYS = [
  'families',
  'transactions',
  'paymentIntents',
  'expenses',
  'events',
  'eventRegistrations',
  'cancellationLogs',
  'assets',
  'assetCheckouts',
  'poojaBookings',
  'whatsappLogs',
  'approvalRequests',
  'whatsAppRetryQueue',
]

function getRecordMandirId(record) {
  return ensureRequiredString(record?.mandirId) || DEFAULT_MANDIR_ID
}

function normalizeMandirId(value) {
  return ensureRequiredString(value)
}

function ensureMandirExists(db, mandirId) {
  const id = normalizeMandirId(mandirId)
  if (!id) {
    throw badRequest('mandirId is required.')
  }
  const exists = (db.mandirs || []).some((mandir) => mandir.id === id)
  if (!exists) {
    throw badRequest(`Mandir ${id} not found.`)
  }
  return id
}

function getSingleMandirId(db) {
  const activeMandir = (db.mandirs || []).find(
    (mandir) => mandir && mandir.isActive !== false && normalizeMandirId(mandir.id),
  )
  return (
    normalizeMandirId(activeMandir?.id) ||
    normalizeMandirId(db.mandirs?.[0]?.id) ||
    DEFAULT_MANDIR_ID
  )
}

function resolveMandirId(req, db, { allowBody = true } = {}) {
  void req
  void allowBody
  const singleMandirId = getSingleMandirId(db)
  return ensureMandirExists(db, singleMandirId)
}

function filterByMandir(collection, mandirId) {
  return (collection || []).filter((record) => getRecordMandirId(record) === mandirId)
}

function scopeDbByMandir(db, mandirId) {
  const scoped = { ...db }
  TENANT_COLLECTION_KEYS.forEach((key) => {
    scoped[key] = filterByMandir(db[key], mandirId)
  })
  scoped.mandirProfile = getMandirProfile(db, mandirId)
  return scoped
}

function withMandir(record, mandirId) {
  return {
    ...record,
    mandirId,
  }
}

function getMandirProfile(db, mandirId) {
  const tenant = (db.mandirs || []).find((mandir) => mandir.id === mandirId)
  if (!tenant) return db.mandirProfile || {}

  return {
    name: ensureRequiredString(tenant.name) || db.mandirProfile?.name || '',
    address: ensureRequiredString(tenant.address) || db.mandirProfile?.address || '',
    pan: ensureRequiredString(tenant.pan) || db.mandirProfile?.pan || '',
    reg80G: ensureRequiredString(tenant.reg80G) || db.mandirProfile?.reg80G || '',
    trustNumber: ensureRequiredString(tenant.trustNumber) || db.mandirProfile?.trustNumber || '',
    letterhead: ensureRequiredString(tenant.letterhead) || db.mandirProfile?.letterhead || '',
  }
}

module.exports = {
  DEFAULT_MANDIR_ID,
  getRecordMandirId,
  ensureMandirExists,
  resolveMandirId,
  filterByMandir,
  scopeDbByMandir,
  withMandir,
  getMandirProfile,
}
