const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function normalizeIsoDate(value) {
  const date = String(value || '').trim()
  if (!ISO_DATE_PATTERN.test(date)) {
    return ''
  }
  return date
}

function normalizeBookingRange(input = {}) {
  const singleDate = normalizeIsoDate(input.date)
  const startDate = normalizeIsoDate(input.startDate) || singleDate
  const endDate = normalizeIsoDate(input.endDate) || singleDate || startDate

  if (!startDate || !endDate) return null
  if (startDate > endDate) return null

  return {
    date: startDate,
    startDate,
    endDate,
  }
}

function getBookingRange(booking = {}) {
  return normalizeBookingRange({
    date: booking.date,
    startDate: booking.startDate,
    endDate: booking.endDate,
  })
}

function withNormalizedBookingRange(booking = {}) {
  const range = getBookingRange(booking)
  if (!range) return booking
  return {
    ...booking,
    ...range,
  }
}

function doesBookingRangeOverlap(requestedRange, booking = {}) {
  const source = normalizeBookingRange(requestedRange)
  const target = getBookingRange(booking)
  if (!source || !target) return false
  return source.startDate <= target.endDate && target.startDate <= source.endDate
}

function isDateWithinBooking(date, booking = {}) {
  const normalizedDate = normalizeIsoDate(date)
  const range = getBookingRange(booking)
  if (!normalizedDate || !range) return false
  return range.startDate <= normalizedDate && normalizedDate <= range.endDate
}

module.exports = {
  normalizeIsoDate,
  normalizeBookingRange,
  getBookingRange,
  withNormalizedBookingRange,
  doesBookingRangeOverlap,
  isDateWithinBooking,
}
