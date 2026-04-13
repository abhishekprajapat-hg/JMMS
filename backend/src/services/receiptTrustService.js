const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const dotenv = require('dotenv')
const { env } = require('../config/env')

const DEFAULT_RUNTIME_ENV_PATH = path.resolve(__dirname, '../../.env')

function formatReceiptNumber(sequenceNumber) {
  return `RCT-${String(sequenceNumber).padStart(6, '0')}`
}

function getRuntimeEnvPath() {
  const overridePath = String(process.env.PUNYANIDHI_RUNTIME_ENV_PATH || '').trim()
  return overridePath ? path.resolve(overridePath) : DEFAULT_RUNTIME_ENV_PATH
}

function getRuntimeReceiptBaseUrl() {
  try {
    const runtimeEnvPath = getRuntimeEnvPath()
    if (fs.existsSync(runtimeEnvPath)) {
      const fileEnv = dotenv.parse(fs.readFileSync(runtimeEnvPath, 'utf8'))
      const runtimeValue = String(fileEnv.RECEIPT_PUBLIC_BASE_URL || '').trim()
      if (runtimeValue) return runtimeValue.replace(/\/+$/, '')
    }
  } catch (_error) {}
  return String(env.receiptPublicBaseUrl || '').trim().replace(/\/+$/, '')
}

function getPublicBaseUrl() {
  const custom = getRuntimeReceiptBaseUrl()
  if (custom) return custom.replace(/\/+$/, '')
  return `http://localhost:${env.port}`
}

function signatureInput(transaction) {
  return [
    transaction.id,
    transaction.receiptNumber,
    String(transaction.amount),
    transaction.type,
    transaction.fundCategory,
    transaction.status,
    transaction.familyId || '-',
    transaction.createdAt || '-',
    transaction.paidAt || '-',
  ].join('|')
}

function computeReceiptHash(db, transaction) {
  const secret = String(db.jobs?.receiptSignatureSecret || '')
  return crypto.createHmac('sha256', secret).update(signatureInput(transaction)).digest('hex')
}

function buildReceiptVerificationUrl(transaction) {
  const base = getPublicBaseUrl()
  const params = new URLSearchParams({
    receiptNumber: String(transaction.receiptNumber || ''),
    hash: String(transaction.receiptVerificationHash || ''),
  })
  return `${base}/api/system/receipts/verify?${params.toString()}`
}

function ensureReceiptMetadata(db, transaction) {
  if (!transaction.receiptNumber) {
    const nextSequence = Number(db.jobs?.nextReceiptSequence) || 1
    transaction.receiptNumber = formatReceiptNumber(nextSequence)
    db.jobs.nextReceiptSequence = nextSequence + 1
  }

  if (!transaction.receiptIssuedAt) {
    transaction.receiptIssuedAt = transaction.paidAt || transaction.createdAt || new Date().toISOString()
  }

  const expectedHash = computeReceiptHash(db, transaction)
  if (transaction.receiptVerificationHash !== expectedHash) {
    transaction.receiptVerificationHash = expectedHash
  }

  transaction.receiptVerificationUrl = buildReceiptVerificationUrl(transaction)
  return transaction
}

function verifyReceiptIntegrity(db, transaction, providedHash = '') {
  if (!transaction || !transaction.receiptNumber || !transaction.receiptVerificationHash) {
    return { valid: false, reason: 'Receipt metadata is incomplete.' }
  }

  const expectedHash = computeReceiptHash(db, transaction)
  if (expectedHash !== transaction.receiptVerificationHash) {
    return { valid: false, reason: 'Receipt signature mismatch in data store.' }
  }

  if (!providedHash) {
    return { valid: true, reason: 'Receipt signature is valid.' }
  }

  const actual = Buffer.from(transaction.receiptVerificationHash, 'hex')
  const incoming = Buffer.from(String(providedHash), 'hex')
  const sameLength = actual.length === incoming.length
  if (!sameLength || !crypto.timingSafeEqual(actual, incoming)) {
    return { valid: false, reason: 'Hash in URL does not match receipt signature.' }
  }

  return { valid: true, reason: 'Receipt hash verified.' }
}

module.exports = {
  ensureReceiptMetadata,
  verifyReceiptIntegrity,
}
