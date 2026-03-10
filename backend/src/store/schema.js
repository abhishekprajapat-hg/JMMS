const crypto = require('node:crypto')
const { hashPassword, isPasswordHash } = require('../utils/passwords')
const { DEFAULT_MANDIR_ID } = require('../constants/tenant')

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

function ensureArray(value) {
  return Array.isArray(value) ? value : []
}

function ensureObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }
  return value
}

function ensureNumber(value, fallback) {
  return Number.isFinite(value) ? value : fallback
}

function isLikelyMongoObjectId(value) {
  return /^[a-fA-F0-9]{24}$/.test(String(value || '').trim())
}

function remapMandirIdReferences(root, fromMandirId, toMandirId) {
  if (!fromMandirId || !toMandirId || fromMandirId === toMandirId) {
    return false
  }

  let changed = false
  for (const value of Object.values(root)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (!item || typeof item !== 'object') continue
        if (item.mandirId === fromMandirId) {
          item.mandirId = toMandirId
          changed = true
        }
      }
      continue
    }

    if (!value || typeof value !== 'object') continue
    if (value.mandirId === fromMandirId) {
      value.mandirId = toMandirId
      changed = true
    }
  }

  return changed
}

function countMandirIdReferences(root, mandirId) {
  if (!mandirId) return 0

  let count = 0
  for (const value of Object.values(root)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (!item || typeof item !== 'object') continue
        if (item.mandirId === mandirId) {
          count += 1
        }
      }
      continue
    }

    if (!value || typeof value !== 'object') continue
    if (value.mandirId === mandirId) {
      count += 1
    }
  }
  return count
}

function normalizeSingleMandirId(root) {
  if (!Array.isArray(root.mandirs) || root.mandirs.length !== 1) {
    return false
  }

  const mandir = root.mandirs[0]
  if (!mandir || typeof mandir !== 'object') {
    return false
  }

  const currentMandirId = String(mandir.id || '').trim()
  if (!currentMandirId || currentMandirId === DEFAULT_MANDIR_ID) {
    return false
  }

  if (isLikelyMongoObjectId(currentMandirId)) {
    remapMandirIdReferences(root, currentMandirId, DEFAULT_MANDIR_ID)
    mandir.id = DEFAULT_MANDIR_ID
    return true
  }

  const currentRefCount = countMandirIdReferences(root, currentMandirId)
  const defaultRefCount = countMandirIdReferences(root, DEFAULT_MANDIR_ID)
  if (currentRefCount === 0 && defaultRefCount > 0) {
    mandir.id = DEFAULT_MANDIR_ID
    return true
  }

  return false
}

function ensureMandirShape(root) {
  let changed = false
  const mandirs = ensureArray(root.mandirs)
  if (mandirs !== root.mandirs) {
    root.mandirs = mandirs
    changed = true
  }

  if (!root.mandirs.length) {
    root.mandirs.push({
      id: DEFAULT_MANDIR_ID,
      name: root.mandirProfile?.name || 'Default Mandir',
      address: root.mandirProfile?.address || '',
      pan: root.mandirProfile?.pan || '',
      reg80G: root.mandirProfile?.reg80G || '',
      trustNumber: root.mandirProfile?.trustNumber || '',
      letterhead: root.mandirProfile?.letterhead || '',
      timezone: 'Asia/Kolkata',
      isActive: true,
      createdAt: new Date().toISOString(),
    })
    changed = true
  }

  for (const mandir of root.mandirs) {
    if (!mandir || typeof mandir !== 'object') continue
    if (typeof mandir.id !== 'string' || !mandir.id.trim()) {
      mandir.id = DEFAULT_MANDIR_ID
      changed = true
    }
    if (typeof mandir.name !== 'string') {
      mandir.name = ''
      changed = true
    }
    if (typeof mandir.address !== 'string') {
      mandir.address = ''
      changed = true
    }
    if (typeof mandir.pan !== 'string') {
      mandir.pan = ''
      changed = true
    }
    if (typeof mandir.reg80G !== 'string') {
      mandir.reg80G = ''
      changed = true
    }
    if (typeof mandir.trustNumber !== 'string') {
      mandir.trustNumber = ''
      changed = true
    }
    if (typeof mandir.letterhead !== 'string') {
      mandir.letterhead = ''
      changed = true
    }
    if (typeof mandir.timezone !== 'string') {
      mandir.timezone = 'Asia/Kolkata'
      changed = true
    }
    if (typeof mandir.isActive !== 'boolean') {
      mandir.isActive = true
      changed = true
    }
  }

  return changed
}

function ensureTenantScopedCollections(root) {
  let changed = false
  for (const key of TENANT_COLLECTION_KEYS) {
    const next = ensureArray(root[key])
    if (next !== root[key]) {
      root[key] = next
      changed = true
    }
    for (const item of root[key]) {
      if (!item || typeof item !== 'object') continue
      if (typeof item.mandirId !== 'string' || !item.mandirId.trim()) {
        item.mandirId = DEFAULT_MANDIR_ID
        changed = true
      }
    }
  }
  return changed
}

function ensureDbShape(db) {
  let changed = false

  const root = ensureObject(db)
  if (root !== db) {
    changed = true
  }

  const collectionKeys = [
    'mandirs',
    'users',
    'devoteeUsers',
    'devoteeAffiliations',
    'deviceTokens',
    'globalCalendarEntries',
    'families',
    'transactions',
    'paymentIntents',
    'contentLibrary',
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

  for (const key of collectionKeys) {
    const next = ensureArray(root[key])
    if (next !== root[key]) {
      root[key] = next
      changed = true
    }
  }

  if (ensureMandirShape(root)) {
    changed = true
  }
  if (normalizeSingleMandirId(root)) {
    changed = true
  }
  if (ensureTenantScopedCollections(root)) {
    changed = true
  }

  const familiesById = new Map(
    root.families.map((family) => [family.familyId, family]),
  )

  for (const user of root.users) {
    if (!user || typeof user !== 'object') continue
    if (!isPasswordHash(user.passwordHash)) {
      const legacyPassword = typeof user.password === 'string' ? user.password : ''
      if (legacyPassword) {
        user.passwordHash = hashPassword(legacyPassword)
        delete user.password
        user.passwordMigratedAt = new Date().toISOString()
        changed = true
      }
    }
    if (typeof user.role !== 'string') continue
    if (user.role === 'super_admin') {
      if (user.mandirId) {
        user.mandirId = ''
        changed = true
      }
    } else if (typeof user.mandirId !== 'string' || !user.mandirId.trim()) {
      user.mandirId = DEFAULT_MANDIR_ID
      changed = true
    }
  }

  for (const devoteeUser of root.devoteeUsers) {
    if (!devoteeUser || typeof devoteeUser !== 'object') continue
    if (typeof devoteeUser.status !== 'string') {
      devoteeUser.status = 'active'
      changed = true
    }
    const family = familiesById.get(devoteeUser.familyId)
    const familyMandirId = family?.mandirId || DEFAULT_MANDIR_ID
    if (typeof devoteeUser.mandirId !== 'string' || !devoteeUser.mandirId.trim()) {
      devoteeUser.mandirId = familyMandirId
      changed = true
    }
    if (typeof devoteeUser.email !== 'string') {
      devoteeUser.email = ''
      changed = true
    }
    if (typeof devoteeUser.whatsapp !== 'string') {
      devoteeUser.whatsapp = ''
      changed = true
    }
    if (typeof devoteeUser.fullName !== 'string') {
      devoteeUser.fullName = ''
      changed = true
    }
    if (typeof devoteeUser.createdAt !== 'string') {
      devoteeUser.createdAt = new Date().toISOString()
      changed = true
    }
    if (typeof devoteeUser.lastLoginAt !== 'string') {
      devoteeUser.lastLoginAt = ''
      changed = true
    }
  }

  if (!root.devoteeAffiliations.length) {
    root.devoteeAffiliations = root.devoteeUsers.map((devoteeUser) => ({
      id: `AFF-${String(devoteeUser.id || '').replace(/^DVT-/, '') || crypto.randomUUID()}`,
      devoteeUserId: devoteeUser.id,
      mandirId: devoteeUser.mandirId || DEFAULT_MANDIR_ID,
      familyId: devoteeUser.familyId || '',
      isPrimary: true,
      joinedAt: devoteeUser.createdAt || new Date().toISOString(),
      status: 'active',
    }))
    changed = true
  }

  for (const affiliation of root.devoteeAffiliations) {
    if (!affiliation || typeof affiliation !== 'object') continue
    if (typeof affiliation.mandirId !== 'string' || !affiliation.mandirId.trim()) {
      affiliation.mandirId = DEFAULT_MANDIR_ID
      changed = true
    }
    if (typeof affiliation.status !== 'string') {
      affiliation.status = 'active'
      changed = true
    }
    if (typeof affiliation.isPrimary !== 'boolean') {
      affiliation.isPrimary = false
      changed = true
    }
    if (typeof affiliation.joinedAt !== 'string') {
      affiliation.joinedAt = new Date().toISOString()
      changed = true
    }
  }

  for (const contentItem of root.contentLibrary) {
    if (!contentItem || typeof contentItem !== 'object') continue
    if (typeof contentItem.scope !== 'string') {
      contentItem.scope = 'mandir'
      changed = true
    }
    if (contentItem.scope !== 'global') {
      if (typeof contentItem.mandirId !== 'string' || !contentItem.mandirId.trim()) {
        contentItem.mandirId = DEFAULT_MANDIR_ID
        changed = true
      }
    } else if (contentItem.mandirId) {
      contentItem.mandirId = ''
      changed = true
    }
  }

  const jobs = ensureObject(root.jobs)
  if (jobs !== root.jobs) {
    root.jobs = jobs
    changed = true
  }

  if (typeof jobs.dueReminderLastRunDate !== 'string') {
    jobs.dueReminderLastRunDate = ''
    changed = true
  }
  if (typeof jobs.whatsAppRetryLastRunAt !== 'string') {
    jobs.whatsAppRetryLastRunAt = ''
    changed = true
  }
  if (typeof jobs.setupCompletedAt !== 'string') {
    jobs.setupCompletedAt = ''
    changed = true
  }
  const nextReceiptSeq = ensureNumber(Number(jobs.nextReceiptSequence), 1)
  if (jobs.nextReceiptSequence !== nextReceiptSeq || nextReceiptSeq < 1) {
    jobs.nextReceiptSequence = Math.max(1, nextReceiptSeq)
    changed = true
  }
  if (typeof jobs.receiptSignatureSecret !== 'string' || !jobs.receiptSignatureSecret) {
    jobs.receiptSignatureSecret = crypto.randomBytes(24).toString('hex')
    changed = true
  }

  const auth = ensureObject(root.auth)
  if (auth !== root.auth) {
    root.auth = auth
    changed = true
  }
  const refreshTokens = ensureArray(auth.refreshTokens)
  if (refreshTokens !== auth.refreshTokens) {
    auth.refreshTokens = refreshTokens
    changed = true
  }

  const paymentPortal = ensureObject(root.paymentPortal)
  if (paymentPortal !== root.paymentPortal) {
    root.paymentPortal = paymentPortal
    changed = true
  }
  if (typeof paymentPortal.upiVpa !== 'string') {
    paymentPortal.upiVpa = ''
    changed = true
  }
  if (typeof paymentPortal.payeeName !== 'string') {
    paymentPortal.payeeName = root.mandirProfile?.name || ''
    changed = true
  }
  if (typeof paymentPortal.bankName !== 'string') {
    paymentPortal.bankName = ''
    changed = true
  }
  if (typeof paymentPortal.accountNumber !== 'string') {
    paymentPortal.accountNumber = ''
    changed = true
  }
  if (typeof paymentPortal.ifsc !== 'string') {
    paymentPortal.ifsc = ''
    changed = true
  }
  if (typeof paymentPortal.updatedAt !== 'string') {
    paymentPortal.updatedAt = ''
    changed = true
  }
  if (typeof paymentPortal.mandirId !== 'string' || !paymentPortal.mandirId.trim()) {
    paymentPortal.mandirId = DEFAULT_MANDIR_ID
    changed = true
  }

  return { db: root, changed }
}

module.exports = { ensureDbShape }
