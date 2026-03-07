import { useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../services/api'
import { formatCurrency, formatDate, toISODate } from '../utils/validation'

function getInitialEventForm(halls) {
  return {
    name: '',
    date: toISODate(),
    hall: halls[0] || '',
    capacity: 50,
    feePerFamily: '',
    resourceRequirements: 'Sound System, Seating',
    notes: '',
  }
}

function getInitialRegisterForm(events, families) {
  return {
    eventId: events[0]?.id || '',
    familyId: families[0]?.familyId || '',
    seats: 1,
    notes: '',
  }
}

export function EventsModule({ authToken, families, eventHalls, permissions, onNotice, onRefreshTransactions }) {
  const [loading, setLoading] = useState(false)
  const [events, setEvents] = useState([])
  const [registrations, setRegistrations] = useState([])
  const [eventForm, setEventForm] = useState(() => getInitialEventForm(eventHalls))
  const [registerForm, setRegisterForm] = useState(() => getInitialRegisterForm([], families))

  const familyLookup = useMemo(
    () => Object.fromEntries(families.map((family) => [family.familyId, family.headName])),
    [families],
  )
  const eventLookup = useMemo(
    () => Object.fromEntries(events.map((event) => [event.id, event])),
    [events],
  )

  async function loadEvents() {
    if (!authToken) return
    setLoading(true)
    try {
      const response = await apiRequest('/events', { token: authToken })
      setEvents(response.events || [])
      setRegistrations(response.registrations || [])
    } catch (error) {
      onNotice('error', error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEvents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken])

  useEffect(() => {
    setEventForm((current) => ({
      ...current,
      hall: eventHalls.includes(current.hall) ? current.hall : eventHalls[0] || '',
    }))
  }, [eventHalls])

  useEffect(() => {
    setRegisterForm((current) => {
      const eventId = current.eventId && events.some((event) => event.id === current.eventId)
        ? current.eventId
        : events[0]?.id || ''
      const familyId = current.familyId && families.some((family) => family.familyId === current.familyId)
        ? current.familyId
        : families[0]?.familyId || ''
      return {
        ...current,
        eventId,
        familyId,
      }
    })
  }, [events, families])

  async function handleCreateEvent(event) {
    event.preventDefault()

    if (!eventForm.name || !eventForm.date || !eventForm.hall || !eventForm.capacity) {
      onNotice('error', 'Event name, date, hall, and capacity are required.')
      return
    }

    setLoading(true)
    try {
      const response = await apiRequest('/events', {
        method: 'POST',
        token: authToken,
        body: {
          ...eventForm,
          capacity: Number(eventForm.capacity),
          feePerFamily: Number(eventForm.feePerFamily || 0),
          resourceRequirements: String(eventForm.resourceRequirements || '')
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean),
        },
      })
      setEvents((current) => [response.event, ...current])
      setEventForm(getInitialEventForm(eventHalls))
      onNotice('success', `Event ${response.event.id} created.`)
    } catch (error) {
      onNotice('error', error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(event) {
    event.preventDefault()
    if (!registerForm.eventId || !registerForm.familyId || !registerForm.seats) {
      onNotice('error', 'Event, family, and seats are required.')
      return
    }

    setLoading(true)
    try {
      const response = await apiRequest(`/events/${registerForm.eventId}/register`, {
        method: 'POST',
        token: authToken,
        body: {
          familyId: registerForm.familyId,
          seats: Number(registerForm.seats),
          notes: registerForm.notes,
        },
      })
      setRegistrations((current) => [response.registration, ...current])
      setRegisterForm((current) => ({ ...current, notes: '' }))
      await loadEvents()
      if (response.transaction) {
        await onRefreshTransactions()
        onNotice('success', `Registration complete. Pledge ${response.transaction.id} created.`)
      } else {
        onNotice('success', `Registration ${response.registration.id} created.`)
      }
    } catch (error) {
      onNotice('error', error.message)
    } finally {
      setLoading(false)
    }
  }

  async function markCheckIn(registrationId) {
    setLoading(true)
    try {
      const response = await apiRequest(`/events/registrations/${registrationId}/checkin`, {
        method: 'POST',
        token: authToken,
      })
      setRegistrations((current) =>
        current.map((registration) =>
          registration.id === registrationId ? response.registration : registration,
        ),
      )
      onNotice('success', `Registration ${registrationId} checked in.`)
    } catch (error) {
      onNotice('error', error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="panel-grid two-column">
      <article className="panel">
        <div className="panel-head">
          <h2>Advanced Event & Pooja Management</h2>
          <p>Create events with hall/resources, capacity rules, and paid registrations.</p>
        </div>

        {permissions.manageEvents ? (
          <>
            <form className="stack-form" onSubmit={handleCreateEvent}>
              <h3>Create Event</h3>
              <label>
                Event Name
                <input
                  value={eventForm.name}
                  onChange={(event) => setEventForm((current) => ({ ...current, name: event.target.value }))}
                />
              </label>
              <label>
                Date
                <input
                  type="date"
                  value={eventForm.date}
                  onChange={(event) => setEventForm((current) => ({ ...current, date: event.target.value }))}
                />
              </label>
              <label>
                Hall
                <select
                  value={eventForm.hall}
                  onChange={(event) => setEventForm((current) => ({ ...current, hall: event.target.value }))}
                >
                  {eventHalls.map((hall) => (
                    <option key={hall} value={hall}>
                      {hall}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Capacity
                <input
                  type="number"
                  min="1"
                  value={eventForm.capacity}
                  onChange={(event) => setEventForm((current) => ({ ...current, capacity: event.target.value }))}
                />
              </label>
              <label>
                Fee Per Family (INR)
                <input
                  type="number"
                  min="0"
                  value={eventForm.feePerFamily}
                  onChange={(event) => setEventForm((current) => ({ ...current, feePerFamily: event.target.value }))}
                />
              </label>
              <label>
                Resources (comma separated)
                <input
                  value={eventForm.resourceRequirements}
                  onChange={(event) =>
                    setEventForm((current) => ({ ...current, resourceRequirements: event.target.value }))
                  }
                />
              </label>
              <label>
                Notes
                <textarea
                  value={eventForm.notes}
                  onChange={(event) => setEventForm((current) => ({ ...current, notes: event.target.value }))}
                />
              </label>
              <button type="submit" disabled={loading}>Create Event</button>
            </form>

            <form className="stack-form" onSubmit={handleRegister}>
              <h3>Register Family</h3>
              <label>
                Event
                <select
                  value={registerForm.eventId}
                  onChange={(event) => setRegisterForm((current) => ({ ...current, eventId: event.target.value }))}
                >
                  {events.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({formatDate(item.date)})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Family
                <select
                  value={registerForm.familyId}
                  onChange={(event) => setRegisterForm((current) => ({ ...current, familyId: event.target.value }))}
                >
                  {families.map((family) => (
                    <option key={family.familyId} value={family.familyId}>
                      {family.familyId} - {family.headName}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Seats
                <input
                  type="number"
                  min="1"
                  value={registerForm.seats}
                  onChange={(event) => setRegisterForm((current) => ({ ...current, seats: event.target.value }))}
                />
              </label>
              <label>
                Notes
                <input
                  value={registerForm.notes}
                  onChange={(event) => setRegisterForm((current) => ({ ...current, notes: event.target.value }))}
                />
              </label>
              <button type="submit" disabled={loading}>Register Family</button>
            </form>
          </>
        ) : (
          <p className="hint">Read-only event visibility for this role.</p>
        )}
      </article>

      <article className="panel">
        <div className="panel-head">
          <h2>Events & Registrations</h2>
          <p>Capacity checks, check-in log, and auto pledge creation for paid events.</p>
        </div>

        <div className="table-wrap compact">
          <table>
            <thead>
              <tr>
                <th>Event ID</th>
                <th>Name</th>
                <th>Date</th>
                <th>Hall</th>
                <th>Capacity</th>
                <th>Seats</th>
                <th>Fee</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 && (
                <tr>
                  <td colSpan="7">No events created yet.</td>
                </tr>
              )}
              {events.map((event) => (
                <tr key={event.id}>
                  <td>{event.id}</td>
                  <td>{event.name}</td>
                  <td>{formatDate(event.date)}</td>
                  <td>{event.hall}</td>
                  <td>{event.capacity}</td>
                  <td>
                    {event.seatsBooked || 0}/{event.capacity}
                  </td>
                  <td>{formatCurrency(event.feePerFamily)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Registration ID</th>
                <th>Event</th>
                <th>Family</th>
                <th>Seats</th>
                <th>Payment</th>
                <th>Pledge TXN</th>
                <th>Check-In</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {registrations.length === 0 && (
                <tr>
                  <td colSpan="8">No registrations yet.</td>
                </tr>
              )}
              {registrations.map((registration) => (
                <tr key={registration.id}>
                  <td>{registration.id}</td>
                  <td>{eventLookup[registration.eventId]?.name || registration.eventId}</td>
                  <td>{familyLookup[registration.familyId] || registration.familyId}</td>
                  <td>{registration.seats}</td>
                  <td>{registration.paymentStatus}</td>
                  <td>{registration.transactionId || '-'}</td>
                  <td>{registration.checkedInAt ? formatDate(registration.checkedInAt) : '-'}</td>
                  <td>
                    {!registration.checkedInAt && permissions.manageEvents ? (
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={() => markCheckIn(registration.id)}
                        disabled={loading}
                      >
                        Check-In
                      </button>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  )
}
