const { ensureRequiredString } = require('../utils/validation')
const { getRecordMandirId } = require('./tenantService')

function getEventSeatsBooked(registrations, { eventId, mandirId, excludeRegistrationId = '' } = {}) {
  if (!eventId) return 0
  return (registrations || [])
    .filter(
      (registration) =>
        registration.eventId === eventId &&
        getRecordMandirId(registration) === mandirId &&
        registration.id !== excludeRegistrationId,
    )
    .reduce((sum, registration) => sum + (Number(registration.seats) || 0), 0)
}

function findEventRegistration(registrations, { eventId, familyId, mandirId } = {}) {
  if (!eventId || !familyId) return null
  return (
    (registrations || []).find(
      (registration) =>
        registration.eventId === eventId &&
        registration.familyId === familyId &&
        getRecordMandirId(registration) === mandirId,
    ) || null
  )
}

function updateEventRegistrationPaymentStatus(
  registrations,
  {
    transactionId,
    mandirId,
    paymentStatus,
    approvalStatus,
  } = {},
) {
  const normalizedTransactionId = ensureRequiredString(transactionId)
  if (!normalizedTransactionId) return []

  const updated = []
  for (const registration of registrations || []) {
    if (
      registration.transactionId === normalizedTransactionId &&
      getRecordMandirId(registration) === mandirId
    ) {
      if (paymentStatus !== undefined) registration.paymentStatus = paymentStatus
      if (approvalStatus !== undefined) registration.approvalStatus = approvalStatus
      updated.push(registration)
    }
  }
  return updated
}

module.exports = {
  getEventSeatsBooked,
  findEventRegistration,
  updateEventRegistrationPaymentStatus,
}
