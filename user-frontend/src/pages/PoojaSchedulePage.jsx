import { useEffect, useState } from 'react'
import { formatDate, toISODate } from '../api'
import { usePortal } from '../context/usePortal'

function getInitialBookingForm(userData) {
  return {
    date: toISODate(),
    slot: userData?.poojaSlots?.[0] || '',
    notes: '',
  }
}

function getInitialAvailability(userData) {
  const slots = userData?.poojaSlots || []
  return {
    availableSlots: slots,
    bookedSlots: [],
  }
}

export function PoojaSchedulePage() {
  const {
    userData,
    working,
    createBooking,
    showNotice,
    fetchBookingAvailability,
  } = usePortal()
  const [bookingForm, setBookingForm] = useState(() => getInitialBookingForm(userData))
  const [availability, setAvailability] = useState(() => getInitialAvailability(userData))
  const [availabilityLoading, setAvailabilityLoading] = useState(false)

  function applyAvailability(payload) {
    const nextAvailableSlots = payload?.availableSlots || []
    const nextBookedSlots = payload?.bookedSlots || []
    setAvailability({
      availableSlots: nextAvailableSlots,
      bookedSlots: nextBookedSlots,
    })
    setBookingForm((current) => ({
      ...current,
      slot: nextAvailableSlots.includes(current.slot) ? current.slot : nextAvailableSlots[0] || '',
    }))
  }

  useEffect(() => {
    if (!userData || !bookingForm.date) return

    let disposed = false
    async function syncAvailability() {
      setAvailabilityLoading(true)
      const response = await fetchBookingAvailability(bookingForm.date, { silent: true })
      if (disposed) return

      if (response) {
        applyAvailability(response)
      } else {
        applyAvailability({ availableSlots: userData.poojaSlots || [], bookedSlots: [] })
      }
      setAvailabilityLoading(false)
    }

    syncAvailability()
    return () => {
      disposed = true
    }
  }, [bookingForm.date, fetchBookingAvailability, userData])

  if (!userData) {
    return (
      <section className="panel ring-1 ring-amber-100/60">
        <p>Loading pooja schedule...</p>
      </section>
    )
  }

  const summary = userData.summary || {}
  const availableSlots = availability.availableSlots || []
  const bookedSlots = availability.bookedSlots || []
  const bookingSlotValue = bookingForm.slot || availableSlots[0] || ''

  async function handleBookingSubmit(event) {
    event.preventDefault()
    if (!bookingForm.date || !bookingSlotValue) {
      showNotice('error', 'Please choose an available date and slot.')
      return
    }
    if (!availableSlots.includes(bookingSlotValue)) {
      showNotice('error', 'Selected slot is already booked. Please choose another slot.')
      return
    }
    const response = await createBooking({
      ...bookingForm,
      slot: bookingSlotValue,
    })
    if (response) {
      setBookingForm((current) => ({ ...current, notes: '' }))
      const latestAvailability = await fetchBookingAvailability(bookingForm.date, { silent: true })
      if (latestAvailability) {
        applyAvailability(latestAvailability)
      }
    }
  }

  return (
    <section className="profile-stack pb-2">
      <article className="panel ring-1 ring-amber-100/60">
        <div className="panel-head split gap-3">
          <div>
            <h2>Pooja Schedule</h2>
            <p>Book your pooja slot and track all booked schedules.</p>
          </div>
          <div className="chip-row items-center">
            <span className="chip">Family: {summary?.family?.familyId || '-'}</span>
          </div>
        </div>
      </article>

      <section className="content-grid items-start">
        <article className="panel ring-1 ring-amber-100/60">
          <h3>Create Pooja Booking</h3>
          <form className="stack-form" onSubmit={handleBookingSubmit}>
            <label>
              Date
              <input
                type="date"
                value={bookingForm.date}
                onChange={(event) => setBookingForm((current) => ({ ...current, date: event.target.value }))}
              />
            </label>
            <label>
              Slot
              <select
                value={bookingSlotValue}
                onChange={(event) => setBookingForm((current) => ({ ...current, slot: event.target.value }))}
                disabled={availabilityLoading || availableSlots.length === 0}
              >
                {availableSlots.length === 0 ? (
                  <option value="">No slot available</option>
                ) : (
                  availableSlots.map((slot) => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))
                )}
              </select>
            </label>
            {availabilityLoading ? (
              <p>Checking available slots for selected date...</p>
            ) : (
              <p>
                {availableSlots.length > 0
                  ? `${availableSlots.length} slot(s) available for this date.`
                  : 'Selected date par sab slots already booked hain.'}
              </p>
            )}
            {bookedSlots.length > 0 && (
              <p>Booked slots: {bookedSlots.join(' | ')}</p>
            )}
            <label>
              Notes
              <input
                value={bookingForm.notes}
                onChange={(event) => setBookingForm((current) => ({ ...current, notes: event.target.value }))}
              />
            </label>
            <button className="w-full sm:w-auto" type="submit" disabled={working || availabilityLoading || availableSlots.length === 0}>
              Book Slot
            </button>
          </form>
        </article>

        <article className="panel ring-1 ring-amber-100/60">
          <h3>Booked Slots</h3>
          <div className="table-wrap rounded-xl">
            <table>
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Date</th>
                  <th>Slot</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {(summary?.bookings || []).length === 0 && (
                  <tr><td colSpan="4">No pooja slots booked yet.</td></tr>
                )}
                {(summary?.bookings || []).map((booking) => (
                  <tr key={booking.id}>
                    <td>{booking.id}</td>
                    <td>{formatDate(booking.date)}</td>
                    <td>{booking.slot}</td>
                    <td>{booking.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </section>
  )
}
