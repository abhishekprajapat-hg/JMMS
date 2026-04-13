const express = require('express')
const { authorize } = require('../middleware/authorize')
const { getDb, saveDb } = require('../store/db')
const {
  PAYMENT_GATEWAYS,
  POOJA_SLOTS,
  TRANSACTION_TYPES,
  FUND_CATEGORIES,
} = require('../constants/domain')
const { badRequest } = require('../utils/http')
const { ensurePositiveNumber, ensureRequiredString } = require('../utils/validation')
const { createId } = require('../utils/ids')
const { normalizeBookingRange, doesBookingRangeOverlap } = require('../utils/bookingRange')
const {
  getPortalConfig,
  buildPaymentInstructions,
  buildFamilyPortalSummary,
} = require('../services/portalService')
const { updateEventRegistrationPaymentStatus } = require('../services/eventRegistrationService')
const { resolveMandirId, getRecordMandirId, withMandir, scopeDbByMandir } = require('../services/tenantService')

const router = express.Router()

router.post('/session', authorize('accessDevoteePortal'), (req, res, next) => {
  try {
    const db = getDb()
    const mandirId = resolveMandirId(req, db)
    const scopedDb = scopeDbByMandir(db, mandirId)
    const familyId = ensureRequiredString(req.body?.familyId)
    const whatsapp = ensureRequiredString(req.body?.whatsapp)

    if (!familyId || !whatsapp) {
      throw badRequest('familyId and whatsapp are required for portal access.')
    }

    const family = scopedDb.families.find((item) => item.familyId === familyId)
    if (!family || ensureRequiredString(family.whatsapp) !== whatsapp) {
      throw badRequest('Family verification failed. Check family ID and WhatsApp number.')
    }

    const summary = buildFamilyPortalSummary(scopedDb, familyId)
    return res.json({
      summary,
      poojaSlots: POOJA_SLOTS,
      paymentGateways: PAYMENT_GATEWAYS,
      transactionTypes: TRANSACTION_TYPES,
      fundCategories: FUND_CATEGORIES,
      paymentPortal: getPortalConfig(scopedDb),
      mandirId,
    })
  } catch (error) {
    return next(error)
  }
})

router.post('/bookings', authorize('accessDevoteePortal'), async (req, res, next) => {
  try {
    const db = getDb()
    const mandirId = resolveMandirId(req, db)
    const scopedDb = scopeDbByMandir(db, mandirId)
    const familyId = ensureRequiredString(req.body?.familyId)
    const range = normalizeBookingRange({
      date: req.body?.date,
      startDate: req.body?.startDate,
      endDate: req.body?.endDate,
    })
    const slot = ensureRequiredString(req.body?.slot)
    const notes = ensureRequiredString(req.body?.notes)

    if (!familyId || !range || !slot) {
      throw badRequest('familyId, date (or startDate/endDate), and slot are required.')
    }
    if (!scopedDb.families.some((family) => family.familyId === familyId)) {
      throw badRequest('Family profile not found.')
    }
    if (!POOJA_SLOTS.includes(slot)) {
      throw badRequest('Invalid pooja slot.')
    }

    const conflict = db.poojaBookings.find(
      (booking) =>
        booking.slot === slot &&
        getRecordMandirId(booking) === mandirId &&
        doesBookingRangeOverlap(range, booking),
    )
    if (conflict) {
      throw badRequest('This pooja slot is already booked within the selected date range.')
    }

    const booking = withMandir({
      id: createId('POO'),
      ...range,
      slot,
      familyId,
      notes: notes || 'Booked from devotee self-service portal',
      overridden: false,
    }, mandirId)

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
    const mandirId = resolveMandirId(req, db)
    const scopedDb = scopeDbByMandir(db, mandirId)
    const familyId = ensureRequiredString(req.body?.familyId)
    const linkedTransactionId = ensureRequiredString(req.body?.linkedTransactionId)
    const gateway = ensureRequiredString(req.body?.gateway)
    const requestedTransactionType = ensureRequiredString(req.body?.transactionType)
    const requestedFundCategory = ensureRequiredString(req.body?.fundCategory)

    if (!familyId || !scopedDb.families.some((family) => family.familyId === familyId)) {
      throw badRequest('Valid familyId is required.')
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
          (transaction) =>
            transaction.id === linkedTransactionId &&
            transaction.familyId === familyId &&
            getRecordMandirId(transaction) === mandirId,
        )
      : null
    if (linkedTransactionId && !linkedTransaction) {
      throw badRequest('Linked transaction not found for this family.')
    }

    const requestedAmount = ensurePositiveNumber(req.body?.amount)
    const amount = requestedAmount || Number(linkedTransaction?.amount) || 0
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
      source: 'devotee_portal',
      note: ensureRequiredString(req.body?.note) || 'Self-service payment intent',
      transactionType,
      fundCategory,
      payerUtr: '',
      payerName: '',
      proofSubmittedAt: '',
    }, mandirId)

    db.paymentIntents.unshift(paymentIntent)
    await saveDb()
    const instructions = await buildPaymentInstructions(scopedDb, paymentIntent)

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
    const mandirId = resolveMandirId(req, db)
    const paymentIntent = db.paymentIntents.find(
      (item) => item.id === req.params.paymentId && getRecordMandirId(item) === mandirId,
    )
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
    if (paymentIntent.linkedTransactionId) {
      updateEventRegistrationPaymentStatus(db.eventRegistrations, {
        transactionId: paymentIntent.linkedTransactionId,
        mandirId,
        paymentStatus: 'Proof Submitted',
        approvalStatus: 'Pending Verification',
      })
    }
    await saveDb()

    return res.json({ paymentIntent })
  } catch (error) {
    return next(error)
  }
})

module.exports = { portalRoutes: router }
