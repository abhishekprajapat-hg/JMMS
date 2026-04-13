export function SchedulerPage({
  permissions,
  handleBookingSubmit,
  bookingForm,
  setBookingForm,
  poojaSlots,
  families,
  working,
  handleExportBookingsCsv,
  poojaBookings,
  formatDate,
  familyLookup,
}) {
  function getBookingDateLabel(booking) {
    const startDate = booking.startDate || booking.date
    const endDate = booking.endDate || booking.date || startDate
    if (!startDate && !endDate) return '-'
    if (startDate === endDate) return formatDate(startDate)
    return `${formatDate(startDate)} - ${formatDate(endDate)}`
  }

  return (
    <section className="panel-grid two-column">
      <article className="panel">
        <div className="panel-head">
          <h2>Tithi & Pooja Scheduler</h2>
          <p>Slot conflict prevention for overlapping date ranges is enabled.</p>
        </div>

        {permissions.manageSchedule ? (
          <form className="stack-form" onSubmit={handleBookingSubmit}>
            <label>
              Start Date
              <input
                type="date"
                value={bookingForm.startDate}
                onChange={(event) =>
                  setBookingForm((current) => {
                    const nextStartDate = event.target.value
                    const nextEndDate = current.endDate && current.endDate < nextStartDate ? nextStartDate : current.endDate
                    return {
                      ...current,
                      startDate: nextStartDate,
                      endDate: nextEndDate,
                    }
                  })
                }
              />
            </label>
            <label>
              End Date
              <input
                type="date"
                min={bookingForm.startDate}
                value={bookingForm.endDate}
                onChange={(event) => setBookingForm((current) => ({ ...current, endDate: event.target.value }))}
              />
            </label>
            <label>
              Slot
              <select
                value={bookingForm.slot}
                onChange={(event) => setBookingForm((current) => ({ ...current, slot: event.target.value }))}
              >
                {poojaSlots.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Devotee Family
              <select
                value={bookingForm.familyId}
                onChange={(event) => setBookingForm((current) => ({ ...current, familyId: event.target.value }))}
              >
                {families.map((family) => (
                  <option key={family.familyId} value={family.familyId}>
                    {family.familyId} - {family.headName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Notes
              <textarea
                value={bookingForm.notes}
                onChange={(event) => setBookingForm((current) => ({ ...current, notes: event.target.value }))}
              />
            </label>
            <button type="submit" disabled={working}>Book Slot</button>
          </form>
        ) : (
          <p className="hint">Read-only schedule access for this role.</p>
        )}
      </article>

      <article className="panel">
        <div className="panel-head">
          <h2>Booked Slots</h2>
          <p>One family per slot/date unless Trustee override is enabled.</p>
        </div>
        <div className="action-row">
          <button type="button" className="secondary-btn" onClick={handleExportBookingsCsv}>
            Export Bookings CSV
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Date Range</th>
                <th>Slot</th>
                <th>Family</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {poojaBookings.map((booking) => (
                <tr key={booking.id} className={booking.overridden ? 'row-alert' : ''}>
                  <td>{booking.id}</td>
                  <td>{getBookingDateLabel(booking)}</td>
                  <td>{booking.slot}</td>
                  <td>{familyLookup[booking.familyId]?.headName || booking.familyId}</td>
                  <td>{booking.overridden ? `Override: ${booking.notes || 'No note'}` : booking.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  )
}
