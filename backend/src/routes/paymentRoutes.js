const express = require('express')
const QRCode = require('qrcode')
const { getDb, saveDb } = require('../store/db')
const { authorize, authorizeAny } = require('../middleware/authorize')
const {
  FUND_CATEGORIES,
  PAYMENT_GATEWAYS,
  TRANSACTION_TYPES,
} = require('../constants/domain')
const { badRequest, notFound } = require('../utils/http')
const { ensurePositiveNumber, ensureRequiredString } = require('../utils/validation')
const { createId } = require('../utils/ids')
const { generateReceiptPdf } = require('../services/receiptService')
const { sendWhatsAppTemplate } = require('../services/whatsappService')
const { ensureReceiptMetadata } = require('../services/receiptTrustService')
const {
  resolveMandirId,
  filterByMandir,
  withMandir,
  getRecordMandirId,
  getMandirProfile,
} = require('../services/tenantService')

const router = express.Router()

function getPortalConfig(db, mandirId) {
  const config = db.paymentPortal || {}
  return {
    upiVpa: ensureRequiredString(config.upiVpa),
    payeeName: ensureRequiredString(config.payeeName) || ensureRequiredString(getMandirProfile(db, mandirId)?.name),
    bankName: ensureRequiredString(config.bankName),
    accountNumber: ensureRequiredString(config.accountNumber),
    ifsc: ensureRequiredString(config.ifsc),
    updatedAt: ensureRequiredString(config.updatedAt),
  }
}

function maskAccountNumber(value) {
  const raw = String(value || '').replace(/\s+/g, '')
  if (raw.length <= 4) return raw
  return `${'*'.repeat(Math.max(0, raw.length - 4))}${raw.slice(-4)}`
}

function serializePortalConfig(db, mandirId, { masked = false } = {}) {
  const config = getPortalConfig(db, mandirId)
  if (!masked) return config
  return {
    ...config,
    accountNumber: maskAccountNumber(config.accountNumber),
  }
}

async function buildPaymentInstructions(db, paymentIntent, mandirId) {
  const config = getPortalConfig(db, mandirId)
  const hasUpi = Boolean(config.upiVpa)
  const hasBankTransferDetails = Boolean(
    config.payeeName ||
      config.bankName ||
      config.accountNumber ||
      config.ifsc,
  )

  const instructions = {
    preferredGateway: paymentIntent.gateway,
    paymentLink: `manual://pay/${paymentIntent.id}`,
    upiLink: '',
    upiQrDataUrl: '',
    bankTransfer: hasBankTransferDetails
      ? {
          payeeName: config.payeeName,
          bankName: config.bankName,
          accountNumber: config.accountNumber,
          ifsc: config.ifsc,
        }
      : null,
  }

  if (hasUpi) {
    const params = new URLSearchParams({
      pa: config.upiVpa,
      pn: config.payeeName || 'Mandir',
      am: String(paymentIntent.amount),
      tn: `JMMS ${paymentIntent.id}`,
      cu: 'INR',
    })
    const upiLink = `upi://pay?${params.toString()}`
    instructions.upiLink = upiLink
    instructions.upiQrDataUrl = await QRCode.toDataURL(upiLink, {
      width: 280,
      margin: 1,
    })
    instructions.paymentLink = upiLink
  }

  return instructions
}

async function attachReceiptIfPaid({ db, transaction, munimName, mandirId }) {
  if (transaction.status !== 'Paid') return transaction

  ensureReceiptMetadata(db, transaction)
  const familyName =
    transaction.type === 'Gupt Daan'
      ? 'Anonymous (Gupt Daan)'
      : db.families.find(
          (item) => item.familyId === transaction.familyId && getRecordMandirId(item) === mandirId,
        )?.headName || 'Unknown'

  const receipt = await generateReceiptPdf({
    transaction,
    familyName,
    mandirProfile: getMandirProfile(db, mandirId),
    munimName,
    verificationUrl: transaction.receiptVerificationUrl || '',
  })

  return {
    ...transaction,
    ...receipt,
    receiptGeneratedBy: munimName,
  }
}

router.get('/', authorizeAny(['managePayments', 'reconcilePayments', 'logDonations', 'viewFinancialTotals']), (req, res) => {
  const db = getDb()
  const mandirId = resolveMandirId(req, db)
  const canManage = ['trustee', 'admin'].includes(req.user.role)
  res.json({
    paymentIntents: filterByMandir(db.paymentIntents, mandirId),
    gateways: PAYMENT_GATEWAYS,
    transactionTypes: TRANSACTION_TYPES,
    fundCategories: FUND_CATEGORIES,
    paymentPortal: serializePortalConfig(db, mandirId, { masked: !canManage }),
    mandirId,
  })
})

router.get('/portal-config', authorize('managePayments'), (req, res) => {
  const db = getDb()
  const mandirId = resolveMandirId(req, db)
  return res.json({
    paymentPortal: serializePortalConfig(db, mandirId),
    mandirId,
  })
})

router.put('/portal-config', authorize('managePayments'), async (req, res, next) => {
  try {
    const db = getDb()
    const mandirId = resolveMandirId(req, db)
    const upiVpa = ensureRequiredString(req.body?.upiVpa)
    const payeeName = ensureRequiredString(req.body?.payeeName)
    const bankName = ensureRequiredString(req.body?.bankName)
    const accountNumber = ensureRequiredString(req.body?.accountNumber)
    const ifsc = ensureRequiredString(req.body?.ifsc).toUpperCase()

    db.paymentPortal = {
      upiVpa,
      payeeName,
      bankName,
      accountNumber,
      ifsc,
      updatedAt: new Date().toISOString(),
      mandirId,
    }
    await saveDb()

    return res.json({
      paymentPortal: serializePortalConfig(db, mandirId),
      mandirId,
    })
  } catch (error) {
    return next(error)
  }
})

router.post('/intents', authorize('managePayments'), async (req, res, next) => {
  try {
    const db = getDb()
    const mandirId = resolveMandirId(req, db)
    const familyId = ensureRequiredString(req.body?.familyId)
    const gateway = ensureRequiredString(req.body?.gateway)
    const linkedTransactionId = ensureRequiredString(req.body?.linkedTransactionId)
    const amountInput = ensurePositiveNumber(req.body?.amount)
    const requestedTransactionType = ensureRequiredString(req.body?.transactionType)
    const requestedFundCategory = ensureRequiredString(req.body?.fundCategory)

    if (!familyId) {
      throw badRequest('familyId is required.')
    }
    if (!db.families.some((family) => family.familyId === familyId && getRecordMandirId(family) === mandirId)) {
      throw badRequest('Family profile not found.')
    }
    if (!PAYMENT_GATEWAYS.includes(gateway)) {
      throw badRequest('Invalid payment gateway.')
    }
    if (requestedTransactionType && !TRANSACTION_TYPES.includes(requestedTransactionType)) {
      throw badRequest('Invalid transaction type.')
    }
    if (requestedFundCategory && !FUND_CATEGORIES.includes(requestedFundCategory)) {
      throw badRequest('Invalid fund category.')
    }

    const linkedTransaction = linkedTransactionId
      ? db.transactions.find(
          (transaction) => transaction.id === linkedTransactionId && getRecordMandirId(transaction) === mandirId,
        )
      : null
    if (linkedTransactionId && !linkedTransaction) {
      throw badRequest('Linked transaction does not exist.')
    }

    const amount = amountInput || Number(linkedTransaction?.amount) || 0
    if (!amount) {
      throw badRequest('amount is required and must be positive.')
    }
    const transactionType = requestedTransactionType || 'Bhent'
    const fundCategory = requestedFundCategory || 'General Fund'

    const paymentIntent = withMandir({
      id: createId('PAY'),
      familyId,
      linkedTransactionId: linkedTransactionId || '',
      amount,
      gateway,
      status: 'Pending',
      initiatedAt: new Date().toISOString(),
      reconciledAt: '',
      providerReference: '',
      failureReason: '',
      createdBy: req.user.fullName,
      source: ensureRequiredString(req.body?.source) || 'staff_console',
      note: ensureRequiredString(req.body?.note),
      transactionType,
      fundCategory,
      payerUtr: '',
      payerName: '',
      proofSubmittedAt: '',
    }, mandirId)

    db.paymentIntents.unshift(paymentIntent)
    await saveDb()
    const instructions = await buildPaymentInstructions(db, paymentIntent, mandirId)

    return res.status(201).json({
      paymentIntent,
      ...instructions,
    })
  } catch (error) {
    return next(error)
  }
})

router.post('/:paymentId/submit-proof', authorizeAny(['managePayments', 'accessDevoteePortal']), async (req, res, next) => {
  try {
    const db = getDb()
    const mandirId = resolveMandirId(req, db)
    const paymentIntent = db.paymentIntents.find(
      (item) => item.id === req.params.paymentId && getRecordMandirId(item) === mandirId,
    )
    if (!paymentIntent) throw notFound('Payment intent not found.')
    if (!['Pending', 'Proof Submitted'].includes(paymentIntent.status)) {
      throw badRequest('Proof can only be submitted for pending payment intents.')
    }

    const isManager = ['trustee', 'admin'].includes(req.user.role)
    if (!isManager) {
      const familyId = ensureRequiredString(req.body?.familyId)
      if (!familyId || familyId !== paymentIntent.familyId) {
        throw badRequest('Family verification failed for proof submission.')
      }
    }

    const payerUtr = ensureRequiredString(req.body?.payerUtr)
    if (!payerUtr || payerUtr.length < 8) {
      throw badRequest('Valid payerUtr is required.')
    }

    paymentIntent.payerUtr = payerUtr
    paymentIntent.payerName = ensureRequiredString(req.body?.payerName)
    paymentIntent.proofSubmittedAt = new Date().toISOString()
    paymentIntent.status = 'Proof Submitted'

    await saveDb()
    return res.json({ paymentIntent })
  } catch (error) {
    return next(error)
  }
})

router.post('/:paymentId/reconcile', authorize('reconcilePayments'), async (req, res, next) => {
  try {
    const db = getDb()
    const mandirId = resolveMandirId(req, db)
    const paymentIntent = db.paymentIntents.find(
      (item) => item.id === req.params.paymentId && getRecordMandirId(item) === mandirId,
    )
    if (!paymentIntent) throw notFound('Payment intent not found.')
    if (!['Pending', 'Proof Submitted'].includes(paymentIntent.status)) {
      throw badRequest('Only pending or proof-submitted payment intents can be reconciled.')
    }

    const outcome = ensureRequiredString(req.body?.outcome).toLowerCase()
    const providerReference =
      ensureRequiredString(req.body?.providerReference) ||
      ensureRequiredString(paymentIntent.payerUtr) ||
      createId('PGREF')

    if (!['success', 'failed'].includes(outcome)) {
      throw badRequest('outcome must be success or failed.')
    }

    paymentIntent.providerReference = providerReference
    paymentIntent.reconciledAt = new Date().toISOString()

    if (outcome === 'failed') {
      paymentIntent.status = 'Failed'
      paymentIntent.failureReason = ensureRequiredString(req.body?.failureReason) || 'Gateway reconciliation failed.'
      await saveDb()
      return res.json({ paymentIntent })
    }

    paymentIntent.status = 'Success'
    paymentIntent.failureReason = ''

    let settledTransaction = null
    let shouldSendReceipt = false

    if (paymentIntent.linkedTransactionId) {
      const linked = db.transactions.find(
        (transaction) =>
          transaction.id === paymentIntent.linkedTransactionId && getRecordMandirId(transaction) === mandirId,
      )
      if (!linked) {
        throw badRequest('Linked transaction not found for settlement.')
      }
      if (linked.cancelled) {
        throw badRequest('Linked transaction is cancelled and cannot be settled.')
      }

      if (linked.status === 'Pledged') {
        linked.status = 'Paid'
        linked.dueDate = ''
        linked.paidAt = new Date().toISOString()
        const withReceipt = await attachReceiptIfPaid({
          db,
          transaction: linked,
          munimName: req.user.fullName,
          mandirId,
        })
        Object.assign(linked, withReceipt)
        settledTransaction = linked
        shouldSendReceipt = true
      } else {
        settledTransaction = linked
      }
    } else {
      const requestedTransactionType = ensureRequiredString(req.body?.transactionType)
      const requestedFundCategory = ensureRequiredString(req.body?.fundCategory)
      const transactionTypeCandidate = requestedTransactionType || ensureRequiredString(paymentIntent.transactionType)
      const fundCategoryCandidate = requestedFundCategory || ensureRequiredString(paymentIntent.fundCategory)
      const transactionType = TRANSACTION_TYPES.includes(transactionTypeCandidate) ? transactionTypeCandidate : 'Bhent'
      const fundCategory = FUND_CATEGORIES.includes(fundCategoryCandidate) ? fundCategoryCandidate : 'General Fund'

      const createdTransaction = await attachReceiptIfPaid({
        db,
        transaction: withMandir({
          id: createId('TRX'),
          familyId: paymentIntent.familyId,
          type: transactionType,
          fundCategory,
          status: 'Paid',
          amount: paymentIntent.amount,
          createdAt: new Date().toISOString(),
          dueDate: '',
          paidAt: new Date().toISOString(),
          cancelled: false,
          cancellationReason: '',
          cancellationAt: '',
          receiptPath: '',
          receiptFileName: '',
          receiptGeneratedBy: '',
        }, mandirId),
        munimName: req.user.fullName,
        mandirId,
      })
      db.transactions.unshift(createdTransaction)
      paymentIntent.linkedTransactionId = createdTransaction.id
      settledTransaction = createdTransaction
      shouldSendReceipt = true
    }

    await saveDb()

    let whatsappLog = null
    if (shouldSendReceipt && settledTransaction) {
      whatsappLog = await sendWhatsAppTemplate({
        transaction: settledTransaction,
        templateType: 'instant_receipt',
        trigger: 'status_paid',
        initiatedBy: req.user.username,
      })
    }

    return res.json({
      paymentIntent,
      settledTransaction,
      whatsappLog,
    })
  } catch (error) {
    return next(error)
  }
})

module.exports = { paymentRoutes: router }
