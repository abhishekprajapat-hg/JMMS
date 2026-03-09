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
  const eventRegistrations = (db.eventRegistrations || []).filter(
    (registration) => registration.familyId === familyId,
  )
  const paymentIntents = (db.paymentIntents || []).filter((intent) => intent.familyId === familyId)

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
    eventRegistrations,
  }
}

module.exports = {
  getPortalConfig,
  buildPaymentInstructions,
  buildFamilyPortalSummary,
}
