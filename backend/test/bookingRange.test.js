const test = require('node:test')
const assert = require('node:assert/strict')
const {
  normalizeBookingRange,
  doesBookingRangeOverlap,
  isDateWithinBooking,
} = require('../src/utils/bookingRange')

test('normalizeBookingRange accepts single date and expands to same start/end', () => {
  const normalized = normalizeBookingRange({ date: '2026-04-10' })
  assert.deepEqual(normalized, {
    date: '2026-04-10',
    startDate: '2026-04-10',
    endDate: '2026-04-10',
  })
})

test('doesBookingRangeOverlap works for legacy single-date and date-range bookings', () => {
  const overlapsLegacy = doesBookingRangeOverlap(
    { startDate: '2026-04-10', endDate: '2026-04-12' },
    { date: '2026-04-11' },
  )
  const noOverlap = doesBookingRangeOverlap(
    { startDate: '2026-04-10', endDate: '2026-04-12' },
    { startDate: '2026-04-13', endDate: '2026-04-15' },
  )

  assert.equal(overlapsLegacy, true)
  assert.equal(noOverlap, false)
})

test('isDateWithinBooking checks inclusion for date ranges', () => {
  const booking = { startDate: '2026-04-10', endDate: '2026-04-12' }
  assert.equal(isDateWithinBooking('2026-04-10', booking), true)
  assert.equal(isDateWithinBooking('2026-04-11', booking), true)
  assert.equal(isDateWithinBooking('2026-04-12', booking), true)
  assert.equal(isDateWithinBooking('2026-04-13', booking), false)
})
