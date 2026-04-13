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

function formatDateTime(value) {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '-'
  return parsed.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function EventsModule({
  authToken,
  families,
  eventHalls,
  transactions = [],
  permissions,
  onNotice,
  onRefreshTransactions,
}) {
  const [loading, setLoading] = useState(false)
  const [intentsLoading, setIntentsLoading] = useState(false)
  const [events, setEvents] = useState([])
  const [registrations, setRegistrations] = useState([])
  const [paymentIntents, setPaymentIntents] = useState([])
  const [eventForm, setEventForm] = useState(() => getInitialEventForm(eventHalls))
  const [registerForm, setRegisterForm] = useState(() => getInitialRegisterForm([], families))
  const [selectedRegistrationId, setSelectedRegistrationId] = useState('')

  const familyLookup = useMemo(
    () => Object.fromEntries(families.map((family) => [family.familyId, family.headName])),
    [families],
  )
  const eventLookup = useMemo(
    () => Object.fromEntries(events.map((event) => [event.id, event])),
    [events],
  )
  const transactionLookup = useMemo(
    () => Object.fromEntries(transactions.map((transaction) => [transaction.id, transaction])),
    [transactions],
  )
  const canViewPaymentIntents = Boolean(
    permissions.managePayments ||
      permissions.reconcilePayments ||
      permissions.logDonations ||
      permissions.viewFinancialTotals,
  )
  const paymentIntentByTransactionId = useMemo(() => {
    const lookup = {}
    paymentIntents.forEach((intent) => {
      if (!intent.linkedTransactionId || lookup[intent.linkedTransactionId]) return
      lookup[intent.linkedTransactionId] = intent
    })
    return lookup
  }, [paymentIntents])
  const selectedRegistration = useMemo(
    () => registrations.find((registration) => registration.id === selectedRegistrationId) || null,
    [registrations, selectedRegistrationId],
  )
  const selectedTransaction = selectedRegistration?.transactionId
    ? transactionLookup[selectedRegistration.transactionId] || null
    : null
  const selectedPaymentIntent = selectedRegistration?.transactionId
    ? paymentIntentByTransactionId[selectedRegistration.transactionId] || null
    : null

  async function loadEvents({ silent = false } = {}) {
    if (!authToken) return
    if (!silent) setLoading(true)
    try {
      const response = await apiRequest('/events', { token: authToken })
      setEvents(response.events || [])
      setRegistrations(response.registrations || [])
    } catch (error) {
      onNotice('error', error.message)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  async function loadPaymentIntents({ silent = false } = {}) {
    if (!authToken || !canViewPaymentIntents) {
      setPaymentIntents([])
      return
    }
    setIntentsLoading(true)
    try {
      const response = await apiRequest('/payments', { token: authToken })
      setPaymentIntents(response.paymentIntents || [])
    } catch (error) {
      if (!silent) onNotice('error', error.message)
    } finally {
      setIntentsLoading(false)
    }
  }

  useEffect(() => {
    loadEvents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken])

  useEffect(() => {
    loadPaymentIntents({ silent: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken, canViewPaymentIntents])

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

  useEffect(() => {
    if (!selectedRegistrationId) return
    if (!registrations.some((registration) => registration.id === selectedRegistrationId)) {
      setSelectedRegistrationId('')
    }
  }, [registrations, selectedRegistrationId])

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
      await loadEvents({ silent: true })
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

  async function openVerification(registrationId) {
    setSelectedRegistrationId(registrationId)
    if (canViewPaymentIntents) {
      await loadPaymentIntents({ silent: true })
    }
  }

  async function reconcileSelectedPayment(outcome) {
    if (!selectedRegistration) {
      onNotice('error', 'Select a registration first.')
      return
    }
    if (!selectedPaymentIntent) {
      onNotice('error', 'No payment intent found for this registration.')
      return
    }

    setLoading(true)
    try {
      const response = await apiRequest(`/payments/${selectedPaymentIntent.id}/reconcile`, {
        method: 'POST',
        token: authToken,
        body: {
          outcome,
          providerReference: selectedPaymentIntent.payerUtr || `UTR-VERIFY-${Date.now()}`,
          transactionType: selectedPaymentIntent.transactionType || '',
          fundCategory: selectedPaymentIntent.fundCategory || '',
          failureReason: outcome === 'failed' ? 'Payment proof rejected from event verification.' : '',
        },
      })
      setPaymentIntents((current) =>
        current.map((intent) => (intent.id === selectedPaymentIntent.id ? response.paymentIntent : intent)),
      )
      await loadEvents({ silent: true })
      await loadPaymentIntents({ silent: true })
      if (response.settledTransaction) {
        await onRefreshTransactions()
        onNotice(
          'success',
          `Registration ${selectedRegistration.id} approved and transaction ${response.settledTransaction.id} settled.`,
        )
      } else {
        onNotice('success', `Payment ${selectedPaymentIntent.id} marked ${response.paymentIntent.status}.`)
      }
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
                <th>Approval</th>
                <th>Pledge TXN</th>
                <th>Check-In</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {registrations.length === 0 && (
                <tr>
                  <td colSpan="9">No registrations yet.</td>
                </tr>
              )}
              {registrations.map((registration) => (
                <tr
                  key={registration.id}
                  className={`registration-row${selectedRegistrationId === registration.id ? ' is-selected' : ''}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`Open verification for ${registration.id}`}
                  onClick={() => openVerification(registration.id)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return
                    event.preventDefault()
                    openVerification(registration.id)
                  }}
                >
                  <td>{registration.id}</td>
                  <td>{eventLookup[registration.eventId]?.name || registration.eventId}</td>
                  <td>{familyLookup[registration.familyId] || registration.familyId}</td>
                  <td>{registration.seats}</td>
                  <td>{registration.paymentStatus}</td>
                  <td>{registration.approvalStatus || '-'}</td>
                  <td>{registration.transactionId || '-'}</td>
                  <td>{registration.checkedInAt ? formatDate(registration.checkedInAt) : '-'}</td>
                  <td>
                    {!registration.checkedInAt && permissions.manageEvents ? (
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={(event) => {
                          event.stopPropagation()
                          markCheckIn(registration.id)
                        }}
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

        <div className="registration-verify-panel">
          <div className="panel-head">
            <h3>Registration Verification</h3>
            <p>Click a registration row to open payment proof details and verify approval.</p>
          </div>

          {!selectedRegistration ? (
            <p className="hint">Select any registration from the list above.</p>
          ) : (
            <>
              <div className="registration-verify-grid">
                <div className="registration-verify-item">
                  <span>Registration</span>
                  <strong>{selectedRegistration.id}</strong>
                </div>
                <div className="registration-verify-item">
                  <span>Event</span>
                  <strong>{eventLookup[selectedRegistration.eventId]?.name || selectedRegistration.eventId}</strong>
                </div>
                <div className="registration-verify-item">
                  <span>Family</span>
                  <strong>{familyLookup[selectedRegistration.familyId] || selectedRegistration.familyId}</strong>
                </div>
                <div className="registration-verify-item">
                  <span>Seats</span>
                  <strong>{selectedRegistration.seats}</strong>
                </div>
                <div className="registration-verify-item">
                  <span>Payment Status</span>
                  <strong>{selectedRegistration.paymentStatus || '-'}</strong>
                </div>
                <div className="registration-verify-item">
                  <span>Approval Status</span>
                  <strong>{selectedRegistration.approvalStatus || '-'}</strong>
                </div>
                <div className="registration-verify-item">
                  <span>Pledge Transaction</span>
                  <strong>{selectedRegistration.transactionId || '-'}</strong>
                </div>
                <div className="registration-verify-item">
                  <span>Registered At</span>
                  <strong>{formatDateTime(selectedRegistration.registeredAt)}</strong>
                </div>
                <div className="registration-verify-item">
                  <span>Pledge Amount</span>
                  <strong>{selectedTransaction ? formatCurrency(selectedTransaction.amount) : '-'}</strong>
                </div>
                <div className="registration-verify-item">
                  <span>Pledge Status</span>
                  <strong>{selectedTransaction?.status || '-'}</strong>
                </div>
              </div>

              <div className="registration-verify-grid">
                <div className="registration-verify-item">
                  <span>Payment Intent</span>
                  <strong>{selectedPaymentIntent?.id || '-'}</strong>
                </div>
                <div className="registration-verify-item">
                  <span>Intent Status</span>
                  <strong>{selectedPaymentIntent?.status || '-'}</strong>
                </div>
                <div className="registration-verify-item">
                  <span>Gateway</span>
                  <strong>{selectedPaymentIntent?.gateway || '-'}</strong>
                </div>
                <div className="registration-verify-item">
                  <span>UTR</span>
                  <strong>{selectedPaymentIntent?.payerUtr || '-'}</strong>
                </div>
                <div className="registration-verify-item">
                  <span>Payer Name</span>
                  <strong>{selectedPaymentIntent?.payerName || '-'}</strong>
                </div>
                <div className="registration-verify-item">
                  <span>Proof Submitted</span>
                  <strong>{formatDateTime(selectedPaymentIntent?.proofSubmittedAt)}</strong>
                </div>
                <div className="registration-verify-item">
                  <span>Provider Ref</span>
                  <strong>{selectedPaymentIntent?.providerReference || '-'}</strong>
                </div>
                <div className="registration-verify-item">
                  <span>Reconciled At</span>
                  <strong>{formatDateTime(selectedPaymentIntent?.reconciledAt)}</strong>
                </div>
              </div>

              {selectedPaymentIntent?.failureReason ? (
                <p className="hint">Failure reason: {selectedPaymentIntent.failureReason}</p>
              ) : null}

              <div className="action-row registration-verify-actions">
                {canViewPaymentIntents ? (
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => loadPaymentIntents()}
                    disabled={loading || intentsLoading}
                  >
                    {intentsLoading ? 'Refreshing...' : 'Refresh Payment Details'}
                  </button>
                ) : null}

                {['Pending', 'Proof Submitted'].includes(selectedPaymentIntent?.status) && permissions.reconcilePayments ? (
                  <>
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() => reconcileSelectedPayment('success')}
                      disabled={loading}
                    >
                      Verify + Approve
                    </button>
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() => reconcileSelectedPayment('failed')}
                      disabled={loading}
                    >
                      Reject
                    </button>
                  </>
                ) : null}
              </div>

              {!selectedPaymentIntent ? (
                <p className="hint">
                  No linked payment intent found for this registration yet. User must submit payment proof first.
                </p>
              ) : null}
              {selectedPaymentIntent && !permissions.reconcilePayments ? (
                <p className="hint">Read-only mode: your role cannot verify/approve payments.</p>
              ) : null}
            </>
          )}
        </div>
      </article>
    </section>
  )
}
