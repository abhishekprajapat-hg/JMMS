const crypto = require('node:crypto')
const { hashPassword, isPasswordHash } = require('../utils/passwords')

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

function ensureDbShape(db) {
  let changed = false

  const root = ensureObject(db)
  if (root !== db) {
    changed = true
  }

  const collectionKeys = [
    'users',
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
  ]

  for (const key of collectionKeys) {
    const next = ensureArray(root[key])
    if (next !== root[key]) {
      root[key] = next
      changed = true
    }
  }

  for (const user of root.users) {
    if (!user || typeof user !== 'object') continue
    if (isPasswordHash(user.passwordHash)) continue
    const legacyPassword = typeof user.password === 'string' ? user.password : ''
    if (!legacyPassword) continue
    user.passwordHash = hashPassword(legacyPassword)
    delete user.password
    user.passwordMigratedAt = new Date().toISOString()
    changed = true
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

  const whatsappQueue = ensureArray(root.whatsAppRetryQueue)
  if (whatsappQueue !== root.whatsAppRetryQueue) {
    root.whatsAppRetryQueue = whatsappQueue
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

  return { db: root, changed }
}

module.exports = { ensureDbShape }
