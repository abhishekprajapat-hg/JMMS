const express = require('express')
const { getDb, getStorageMode, saveDb } = require('../store/db')
const {
  EVENT_HALLS,
  EXPENSE_CATEGORIES,
  FUND_CATEGORIES,
  MANDIR_PROFILE,
  PAYMENT_GATEWAYS,
  PAYMENT_STATUSES,
  POOJA_SLOTS,
  TRANSACTION_TYPES,
  WHATSAPP_PROVIDERS,
} = require('../constants/domain')
const { ROLE_CONFIG } = require('../constants/rbac')
const { ensureRequiredString, validateIndianWhatsApp } = require('../utils/validation')
const { hashPassword } = require('../utils/passwords')
const { createId } = require('../utils/ids')
const { badRequest } = require('../utils/http')
const { verifyReceiptIntegrity } = require('../services/receiptTrustService')

const router = express.Router()

function isSystemInitialized(db) {
  if (db.jobs?.setupCompletedAt) return true
  if ((db.families || []).length > 0) return true
  if ((db.transactions || []).length > 0) return true
  return (db.users || []).some(
    (user) => !['trustee', 'admin', 'executive'].includes(String(user.username || '').toLowerCase()),
  )
}

router.get('/reference', (_req, res) => {
  const db = getDb()
  res.json({
    mandirProfile: db.mandirProfile || MANDIR_PROFILE,
    transactionTypes: TRANSACTION_TYPES,
    fundCategories: FUND_CATEGORIES,
    paymentStatuses: PAYMENT_STATUSES,
    poojaSlots: POOJA_SLOTS,
    whatsappProviders: WHATSAPP_PROVIDERS,
    paymentGateways: PAYMENT_GATEWAYS,
    expenseCategories: EXPENSE_CATEGORIES,
    eventHalls: EVENT_HALLS,
    paymentPortal: db.paymentPortal || {},
    roles: ROLE_CONFIG,
  })
})

router.get('/setup-status', (_req, res) => {
  const db = getDb()
  const initialized = isSystemInitialized(db)
  res.json({
    initialized,
    requiresSetup: !initialized,
    storageMode: getStorageMode(),
    familyCount: Array.isArray(db.families) ? db.families.length : 0,
    userCount: Array.isArray(db.users) ? db.users.length : 0,
  })
})

router.post('/setup', async (req, res, next) => {
  try {
    const db = getDb()
    const alreadyInitialized = isSystemInitialized(db)
    if (alreadyInitialized) {
      throw badRequest('System setup is already completed.')
    }

    const trusteeFullName = ensureRequiredString(req.body?.trustee?.fullName)
    const trusteeUsername = ensureRequiredString(req.body?.trustee?.username).toLowerCase()
    const trusteePassword = String(req.body?.trustee?.password || '')
    const mandirProfileInput = req.body?.mandirProfile || {}
    const seedFamilies = Array.isArray(req.body?.seedFamilies) ? req.body.seedFamilies : []

    if (!trusteeFullName || !trusteeUsername || !trusteePassword) {
      throw badRequest('trustee.fullName, trustee.username, and trustee.password are required.')
    }
    if (trusteePassword.length < 8) {
      throw badRequest('Trustee password must be at least 8 characters.')
    }

    const hasMandirFields = ['name', 'address', 'pan', 'reg80G', 'trustNumber', 'letterhead'].every((field) =>
      ensureRequiredString(mandirProfileInput[field]),
    )
    if (!hasMandirFields) {
      throw badRequest('All mandirProfile fields are required during setup.')
    }

    db.users = [
      {
        id: createId('USR'),
        username: trusteeUsername,
        passwordHash: hashPassword(trusteePassword),
        role: 'trustee',
        fullName: trusteeFullName,
      },
    ]

    db.mandirProfile = {
      name: ensureRequiredString(mandirProfileInput.name),
      address: ensureRequiredString(mandirProfileInput.address),
      pan: ensureRequiredString(mandirProfileInput.pan),
      reg80G: ensureRequiredString(mandirProfileInput.reg80G),
      trustNumber: ensureRequiredString(mandirProfileInput.trustNumber),
      letterhead: ensureRequiredString(mandirProfileInput.letterhead),
    }

    db.families = seedFamilies
      .map((family, index) => {
        const headName = ensureRequiredString(family?.headName)
        const gotra = ensureRequiredString(family?.gotra)
        const whatsapp = ensureRequiredString(family?.whatsapp)
        const address = ensureRequiredString(family?.address)
        if (!headName || !gotra || !whatsapp || !address) return null
        if (!validateIndianWhatsApp(whatsapp)) return null

        return {
          familyId: `FAM-${String(index + 1).padStart(4, '0')}`,
          headName,
          gotra,
          whatsapp,
          address,
        }
      })
      .filter(Boolean)

    db.jobs.setupCompletedAt = new Date().toISOString()
    await saveDb()

    return res.status(201).json({
      setupCompletedAt: db.jobs.setupCompletedAt,
      trusteeUsername,
      seededFamilyCount: db.families.length,
    })
  } catch (error) {
    return next(error)
  }
})

router.get('/receipts/verify', (req, res) => {
  const receiptNumber = ensureRequiredString(req.query?.receiptNumber)
  const providedHash = ensureRequiredString(req.query?.hash)
  const db = getDb()

  if (!receiptNumber) {
    return res.status(400).json({
      valid: false,
      reason: 'receiptNumber is required.',
    })
  }

  const transaction = db.transactions.find((item) => item.receiptNumber === receiptNumber)
  if (!transaction) {
    return res.status(404).json({
      valid: false,
      reason: 'Receipt not found.',
    })
  }

  const integrity = verifyReceiptIntegrity(db, transaction, providedHash)

  return res.json({
    valid: integrity.valid,
    reason: integrity.reason,
    receipt: {
      receiptNumber: transaction.receiptNumber,
      transactionId: transaction.id,
      amount: transaction.amount,
      type: transaction.type,
      fundCategory: transaction.fundCategory,
      issuedAt: transaction.receiptIssuedAt || transaction.createdAt,
      status: transaction.status,
      cancelled: Boolean(transaction.cancelled),
    },
  })
})

module.exports = { systemRoutes: router }
