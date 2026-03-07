const express = require('express')
const QRCode = require('qrcode')
const { authorize } = require('../middleware/authorize')
const { getDb, saveDb } = require('../store/db')
const { PAYMENT_GATEWAYS, POOJA_SLOTS } = require('../constants/domain')
const { badRequest } = require('../utils/http')
const { ensurePositiveNumber, ensureRequiredString } = require('../utils/validation')
const { createId } = require('../utils/ids')

const router = express.Router()

function getPortalConfig(db) {
  const config = db.paymentPortal || {}
  return {
    upiVpa: ensureRequiredString(config.upiVpa),
    payeeName: ensureRequiredString(config.payeeName) || ensureRequiredString(db.mandirProfile?.name),
    bankName: ensureRequiredString(config.bankName),
    accountNumber: ensureRequiredString(config.accountNumber),
    ifsc: ensureRequiredString(config.ifsc),
    updatedAt: ensureRequiredString(config.updatedAt),
  }
}

async function buildPaymentInstructions(db, paymentIntent) {
  const config = getPortalConfig(db)
  const isDirectUpi = paymentIntent.gateway === 'Direct UPI (No Commission)'
  const isDirectBank = paymentIntent.gateway === 'Direct Bank Transfer (No Commission)'

  const instructions = {
    paymentLink: `manual://pay/${paymentIntent.id}`,
    upiLink: '',
    upiQrDataUrl: '',
    bankTransfer: isDirectBank
      ? {
          payeeName: config.payeeName,
          bankName: config.bankName,
          accountNumber: config.accountNumber,
          ifsc: config.ifsc,
        }
      : null,
  }

  if (isDirectUpi && config.upiVpa) {
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

function buildPortalSummary(db, familyId) {
  const family = db.families.find((item) => item.familyId === familyId)
  if (!family) return null

  const transactions = (db.transactions || []).filter((transaction) => transaction.familyId === familyId)
  const receipts = transactions
    .filter((transaction) => transaction.status === 'Paid' && !transaction.cancelled && transaction.receiptPath)
    .map((transaction) => ({
      transactionId: transaction.id,
      receiptNumber: transaction.receiptNumber || '',
      amount: transaction.amount,
      fundCategory: transaction.fundCategory,
      paidAt: transaction.paidAt || transaction.createdAt,
      receiptPath: transaction.receiptPath,
    }))
  const pendingPledges = transactions.filter(
    (transaction) => transaction.status === 'Pledged' && !transaction.cancelled,
  )

  const bookings = (db.poojaBookings || []).filter((booking) => booking.familyId === familyId)
  const eventRegistrations = (db.eventRegistrations || []).filter(
    (registration) => registration.familyId === familyId,
  )
  const paymentIntents = (db.paymentIntents || []).filter((intent) => intent.familyId === familyId)

  return {
    family,
    stats: {
      lifetimeContributions: transactions
        .filter((transaction) => transaction.status === 'Paid' && !transaction.cancelled)
        .reduce((sum, transaction) => sum + (Number(transaction.amount) || 0), 0),
      pendingAmount: pendingPledges.reduce((sum, transaction) => sum + (Number(transaction.amount) || 0), 0),
      receiptCount: receipts.length,
    },
    pendingPledges,
    paymentIntents,
    receipts,
    bookings,
    eventRegistrations,
  }
}

router.post('/session', authorize('accessDevoteePortal'), (req, res, next) => {
  try {
    const db = getDb()
    const familyId = ensureRequiredString(req.body?.familyId)
    const whatsapp = ensureRequiredString(req.body?.whatsapp)

    if (!familyId || !whatsapp) {
      throw badRequest('familyId and whatsapp are required for portal access.')
    }

    const family = db.families.find((item) => item.familyId === familyId)
    if (!family || ensureRequiredString(family.whatsapp) !== whatsapp) {
      throw badRequest('Family verification failed. Check family ID and WhatsApp number.')
    }

    const summary = buildPortalSummary(db, familyId)
    return res.json({
      summary,
      poojaSlots: POOJA_SLOTS,
      paymentGateways: PAYMENT_GATEWAYS,
      paymentPortal: getPortalConfig(db),
    })
  } catch (error) {
    return next(error)
  }
})

router.post('/bookings', authorize('accessDevoteePortal'), async (req, res, next) => {
  try {
    const db = getDb()
    const familyId = ensureRequiredString(req.body?.familyId)
    const date = ensureRequiredString(req.body?.date)
    const slot = ensureRequiredString(req.body?.slot)
    const notes = ensureRequiredString(req.body?.notes)

    if (!familyId || !date || !slot) {
      throw badRequest('familyId, date, and slot are required.')
    }
    if (!db.families.some((family) => family.familyId === familyId)) {
      throw badRequest('Family profile not found.')
    }
    if (!POOJA_SLOTS.includes(slot)) {
      throw badRequest('Invalid pooja slot.')
    }

    const conflict = db.poojaBookings.find((booking) => booking.date === date && booking.slot === slot)
    if (conflict) {
      throw badRequest('This pooja slot is already booked for the selected date.')
    }

    const booking = {
      id: createId('POO'),
      date,
      slot,
      familyId,
      notes: notes || 'Booked from devotee self-service portal',
      overridden: false,
    }

    db.poojaBookings.unshift(booking)
    await saveDb()

    return res.status(201).json({ booking })
  } catch (error) {
    return next(error)
  }
})

router.post('/payments/intents', authorize('accessDevoteePortal'), async (req, res, next) => {
  try {
    const db = getDb()
    const familyId = ensureRequiredString(req.body?.familyId)
    const linkedTransactionId = ensureRequiredString(req.body?.linkedTransactionId)
    const gateway = ensureRequiredString(req.body?.gateway)

    if (!familyId || !db.families.some((family) => family.familyId === familyId)) {
      throw badRequest('Valid familyId is required.')
    }
    if (!PAYMENT_GATEWAYS.includes(gateway)) {
      throw badRequest('Invalid payment gateway.')
    }

    const linkedTransaction = linkedTransactionId
      ? db.transactions.find((transaction) => transaction.id === linkedTransactionId && transaction.familyId === familyId)
      : null
    if (linkedTransactionId && !linkedTransaction) {
      throw badRequest('Linked transaction not found for this family.')
    }

    const requestedAmount = ensurePositiveNumber(req.body?.amount)
    const amount = requestedAmount || Number(linkedTransaction?.amount) || 0
    if (!amount) {
      throw badRequest('amount is required and must be positive.')
    }

    const paymentIntent = {
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
      source: 'devotee_portal',
      note: ensureRequiredString(req.body?.note) || 'Self-service payment intent',
      payerUtr: '',
      payerName: '',
      proofSubmittedAt: '',
    }

    db.paymentIntents.unshift(paymentIntent)
    await saveDb()
    const instructions = await buildPaymentInstructions(db, paymentIntent)

    return res.status(201).json({
      paymentIntent,
      ...instructions,
    })
  } catch (error) {
    return next(error)
  }
})

router.post('/payments/:paymentId/proof', authorize('accessDevoteePortal'), async (req, res, next) => {
  try {
    const db = getDb()
    const paymentIntent = db.paymentIntents.find((item) => item.id === req.params.paymentId)
    if (!paymentIntent) {
      throw badRequest('Payment intent not found.')
    }

    const familyId = ensureRequiredString(req.body?.familyId)
    if (!familyId || familyId !== paymentIntent.familyId) {
      throw badRequest('Family verification failed for proof submission.')
    }

    if (!['Pending', 'Proof Submitted'].includes(paymentIntent.status)) {
      throw badRequest('Proof can only be submitted for pending payment intents.')
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

module.exports = { portalRoutes: router }
