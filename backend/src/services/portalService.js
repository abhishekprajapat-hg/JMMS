const QRCode = require('qrcode')
const { ensureRequiredString } = require('../utils/validation')

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

function buildFamilyPortalSummary(db, familyId) {
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
  const allEventRegistrations = db.eventRegistrations || []
  const eventRegistrations = allEventRegistrations.filter((registration) => registration.familyId === familyId)
  const paymentIntents = (db.paymentIntents || []).filter((intent) => intent.familyId === familyId)
  const events = db.events || []

  const eventRegistrationsByEventId = allEventRegistrations.reduce((accumulator, registration) => {
    const eventId = ensureRequiredString(registration.eventId)
    if (!eventId) return accumulator
    accumulator[eventId] = (accumulator[eventId] || 0) + (Number(registration.seats) || 0)
    return accumulator
  }, {})

  const familyRegistrationLookup = Object.fromEntries(
    eventRegistrations.map((registration) => [registration.eventId, registration]),
  )

  const enrichedEvents = [...events]
    .sort((left, right) => String(left.date || '').localeCompare(String(right.date || '')))
    .map((event) => ({
      ...event,
      seatsBooked: eventRegistrationsByEventId[event.id] || 0,
      seatsAvailable: Math.max(0, (Number(event.capacity) || 0) - (eventRegistrationsByEventId[event.id] || 0)),
      isFamilyRegistered: Boolean(familyRegistrationLookup[event.id]),
      familyRegistrationId: familyRegistrationLookup[event.id]?.id || '',
    }))

  const eventLookup = Object.fromEntries(enrichedEvents.map((event) => [event.id, event]))
  const latestIntentByLinkedTransaction = {}
  for (const intent of paymentIntents) {
    const linkedTransactionId = ensureRequiredString(intent.linkedTransactionId)
    if (!linkedTransactionId) continue
    const current = latestIntentByLinkedTransaction[linkedTransactionId]
    if (!current || String(intent.initiatedAt || '') > String(current.initiatedAt || '')) {
      latestIntentByLinkedTransaction[linkedTransactionId] = intent
    }
  }

  const transactionsById = Object.fromEntries(transactions.map((transaction) => [transaction.id, transaction]))
  const enrichedRegistrations = eventRegistrations.map((registration) => {
    const event = eventLookup[registration.eventId] || null
    const linkedTransaction = registration.transactionId
      ? transactionsById[registration.transactionId] || null
      : null
    const latestPaymentIntent = registration.transactionId
      ? latestIntentByLinkedTransaction[registration.transactionId] || null
      : null
    const totalAmount = Number(linkedTransaction?.amount) || (Number(event?.feePerFamily || 0) * (Number(registration.seats) || 0))
    const intentStatus = ensureRequiredString(latestPaymentIntent?.status)
    const linkedTransactionStatus = ensureRequiredString(linkedTransaction?.status)
    const paymentStatus =
      ensureRequiredString(registration.paymentStatus) ||
      (linkedTransactionStatus === 'Paid'
        ? 'Paid'
        : intentStatus === 'Proof Submitted'
          ? 'Proof Submitted'
          : intentStatus === 'Pending'
            ? 'Pending'
            : Number(event?.feePerFamily || 0) > 0
              ? 'Pending'
              : 'Not Required')
    const approvalStatus =
      ensureRequiredString(registration.approvalStatus) ||
      (linkedTransactionStatus === 'Paid' || paymentStatus === 'Not Required'
        ? 'Approved'
        : intentStatus === 'Failed' || paymentStatus === 'Payment Failed'
          ? 'Rejected'
          : paymentStatus === 'Proof Submitted'
            ? 'Pending Verification'
            : 'Pending Payment')
    const canPayNow = Boolean(
      linkedTransaction &&
      linkedTransaction.status === 'Pledged' &&
      !linkedTransaction.cancelled,
    )

    return {
      ...registration,
      paymentStatus,
      approvalStatus,
      eventName: event?.name || registration.eventId,
      eventDate: event?.date || '',
      eventHall: event?.hall || '',
      eventFeePerFamily: Number(event?.feePerFamily || 0),
      totalAmount,
      canPayNow,
      linkedTransaction: linkedTransaction
        ? {
            id: linkedTransaction.id,
            amount: Number(linkedTransaction.amount) || 0,
            status: linkedTransaction.status || '',
            dueDate: linkedTransaction.dueDate || '',
            cancelled: Boolean(linkedTransaction.cancelled),
          }
        : null,
      latestPaymentIntent: latestPaymentIntent
        ? {
            id: latestPaymentIntent.id,
            status: latestPaymentIntent.status || '',
            initiatedAt: latestPaymentIntent.initiatedAt || '',
            linkedTransactionId: latestPaymentIntent.linkedTransactionId || '',
          }
        : null,
    }
  })

  return {
    family,
    donations: transactions,
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
    events: enrichedEvents,
    eventRegistrations: enrichedRegistrations,
  }
}

module.exports = {
  getPortalConfig,
  buildPaymentInstructions,
  buildFamilyPortalSummary,
}
