
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

function getInitialSubEventForm(events, halls) {
  const parentEvent = events[0] || null
  return {
    parentEventId: parentEvent?.id || '',
    name: '',
    date: parentEvent?.date || toISODate(),
    hall: parentEvent?.hall || halls[0] || '',
    capacity: parentEvent?.capacity || '',
    feePerFamily: '',
    notes: '',
  }
}

function getSubEventEditForm(subEvent, halls) {
  return {
    name: subEvent?.name || '',
    date: subEvent?.date || toISODate(),
    hall: subEvent?.hall || halls[0] || '',
    capacity: subEvent?.capacity || '',
    feePerFamily: String(subEvent?.feePerFamily ?? ''),
    notes: subEvent?.notes || '',
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

function includesQuery(values, query) {
  const needle = String(query || '').trim().toLowerCase()
  if (!needle) return true

  return values.some((value) =>
    String(value || '')
      .toLowerCase()
      .includes(needle),
  )
}

function getRegistrationState(registration) {
  if (registration?.checkedInAt) return 'checked-in'

  const paymentStatus = String(registration?.paymentStatus || '').toLowerCase()
  const approvalStatus = String(registration?.approvalStatus || '').toLowerCase()

  if (
    paymentStatus.includes('reject') ||
    paymentStatus.includes('fail') ||
    approvalStatus.includes('reject')
  ) {
    return 'rejected'
  }

  if (
    approvalStatus.includes('approved') ||
    paymentStatus === 'paid' ||
    paymentStatus === 'not required'
  ) {
    return 'approved'
  }

  return 'pending'
}

function getRegistrationStateLabel(state) {
  if (state === 'checked-in') return 'Checked-In'
  if (state === 'approved') return 'Approved'
  if (state === 'rejected') return 'Rejected'
  return 'Pending'
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
  const [subEventForm, setSubEventForm] = useState(() => getInitialSubEventForm([], eventHalls))
  const [subEventEditForm, setSubEventEditForm] = useState(() => getSubEventEditForm(null, eventHalls))
  const [selectedSubEvent, setSelectedSubEvent] = useState({ eventId: '', subEventId: '' })
  const [selectedRegistrationId, setSelectedRegistrationId] = useState('')
  const [activeAdminTab, setActiveAdminTab] = useState('create-event')
  const [activeDataTab, setActiveDataTab] = useState('events')
  const [searchQuery, setSearchQuery] = useState('')
  const [registrationFilter, setRegistrationFilter] = useState('all')

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

  const subEvents = useMemo(
    () =>
      events.flatMap((event) =>
        Array.isArray(event.subEvents)
          ? event.subEvents.map((subEvent) => ({
            ...subEvent,
            parentEventId: event.id,
            parentEventName: event.name,
          }))
          : [],
      ),
    [events],
  )

  const today = toISODate()

  const overview = useMemo(() => {
    const totalCapacity = events.reduce((total, event) => total + (Number(event.capacity) || 0), 0)
    const totalBooked = events.reduce((total, event) => total + (Number(event.seatsBooked) || 0), 0)
    const upcoming = events.filter((event) => String(event.date || '') >= today).length
    const pendingRegistrations = registrations.filter(
      (registration) => getRegistrationState(registration) === 'pending',
    ).length
    const checkedIn = registrations.filter((registration) => Boolean(registration.checkedInAt)).length
    const pendingProofs = paymentIntents.filter((intent) =>
      ['Pending', 'Proof Submitted'].includes(String(intent.status || '')),
    ).length

    return {
      totalCapacity,
      totalBooked,
      upcoming,
      pendingRegistrations,
      checkedIn,
      pendingProofs,
    }
  }, [events, registrations, paymentIntents, today])

  const filteredEvents = useMemo(
    () =>
      events.filter((event) =>
        includesQuery(
          [
            event.id,
            event.name,
            event.date,
            event.hall,
            event.notes,
            Array.isArray(event.resourceRequirements) ? event.resourceRequirements.join(', ') : '',
          ],
          searchQuery,
        ),
      ),
    [events, searchQuery],
  )

  const filteredSubEvents = useMemo(
    () =>
      subEvents.filter((subEvent) =>
        includesQuery(
          [
            subEvent.id,
            subEvent.name,
            subEvent.parentEventName,
            subEvent.date,
            subEvent.hall,
            subEvent.notes,
          ],
          searchQuery,
        ),
      ),
    [subEvents, searchQuery],
  )

  const filteredRegistrations = useMemo(
    () =>
      registrations.filter((registration) => {
        const registrationState = getRegistrationState(registration)
        const matchesFilter = registrationFilter === 'all' || registrationFilter === registrationState
        if (!matchesFilter) return false

        return includesQuery(
          [
            registration.id,
            registration.eventId,
            eventLookup[registration.eventId]?.name,
            registration.familyId,
            familyLookup[registration.familyId],
            registration.paymentStatus,
            registration.approvalStatus,
            registration.transactionId,
          ],
          searchQuery,
        )
      }),
    [registrations, registrationFilter, searchQuery, eventLookup, familyLookup],
  )

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

  async function refreshDashboard() {
    await loadEvents()
    if (canViewPaymentIntents) {
      await loadPaymentIntents({ silent: true })
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
      const eventId =
        current.eventId && events.some((event) => event.id === current.eventId)
          ? current.eventId
          : events[0]?.id || ''

      const familyId =
        current.familyId && families.some((family) => family.familyId === current.familyId)
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
    setSubEventForm((current) => {
      const selectedParentEvent = events.find((event) => event.id === current.parentEventId) || events[0] || null
      const parentEventId = selectedParentEvent?.id || ''
      const hall = eventHalls.includes(current.hall)
        ? current.hall
        : selectedParentEvent?.hall || eventHalls[0] || ''

      return {
        ...current,
        parentEventId,
        hall,
      }
    })
  }, [events, eventHalls])

  useEffect(() => {
    if (!selectedRegistrationId) return
    if (!registrations.some((registration) => registration.id === selectedRegistrationId)) {
      setSelectedRegistrationId('')
    }
  }, [registrations, selectedRegistrationId])

  useEffect(() => {
    if (!selectedSubEvent.eventId || !selectedSubEvent.subEventId) return

    const parentEvent = events.find((event) => event.id === selectedSubEvent.eventId)
    const exists = Array.isArray(parentEvent?.subEvents)
      ? parentEvent.subEvents.some((subEvent) => subEvent.id === selectedSubEvent.subEventId)
      : false

    if (!exists) {
      setSelectedSubEvent({ eventId: '', subEventId: '' })
      setSubEventEditForm(getSubEventEditForm(null, eventHalls))
      if (activeAdminTab === 'edit-sub-event') {
        setActiveAdminTab('create-sub-event')
      }
    }
  }, [events, selectedSubEvent, eventHalls, activeAdminTab])

  function mergeUpdatedEvent(updatedEvent) {
    if (!updatedEvent?.id) return
    setEvents((current) =>
      current.map((event) => (event.id === updatedEvent.id ? updatedEvent : event)),
    )
  }

  function updateSubEventParent(parentEventId) {
    const parentEvent = events.find((event) => event.id === parentEventId) || null

    setSubEventForm((current) => ({
      ...current,
      parentEventId,
      date: parentEvent?.date || current.date,
      hall: parentEvent?.hall || current.hall,
      capacity: parentEvent?.capacity || current.capacity,
    }))
  }

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
      setActiveDataTab('events')
      onNotice('success', `Event ${response.event.id} created.`)
    } catch (error) {
      onNotice('error', error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateSubEvent(event) {
    event.preventDefault()

    if (!subEventForm.parentEventId) {
      onNotice('error', 'Create a parent event first.')
      return
    }
    if (!subEventForm.name || !subEventForm.date || !subEventForm.hall) {
      onNotice('error', 'Sub-event name, date, and hall are required.')
      return
    }
    if (subEventForm.capacity && Number(subEventForm.capacity) < 1) {
      onNotice('error', 'Sub-event capacity must be at least 1.')
      return
    }
    if (subEventForm.feePerFamily && Number(subEventForm.feePerFamily) < 0) {
      onNotice('error', 'Sub-event fee cannot be negative.')
      return
    }

    setLoading(true)
    try {
      const payload = {
        name: subEventForm.name,
        date: subEventForm.date,
        hall: subEventForm.hall,
        notes: subEventForm.notes,
        feePerFamily: Number(subEventForm.feePerFamily || 0),
      }

      if (subEventForm.capacity) {
        payload.capacity = Number(subEventForm.capacity)
      }

      const response = await apiRequest(`/events/${subEventForm.parentEventId}/sub-events`, {
        method: 'POST',
        token: authToken,
        body: payload,
      })

      mergeUpdatedEvent(response.event)
      setSubEventForm((current) => ({
        ...current,
        name: '',
        feePerFamily: '',
        notes: '',
      }))
      setActiveDataTab('sub-events')
      onNotice('success', `Sub-event ${response.subEvent.id} created.`)
    } catch (error) {
      onNotice('error', error.message)
    } finally {
      setLoading(false)
    }
  }

  function beginSubEventEdit(parentEventId, subEvent) {
    setSelectedSubEvent({
      eventId: parentEventId,
      subEventId: subEvent.id,
    })
    setSubEventEditForm(getSubEventEditForm(subEvent, eventHalls))
    setActiveAdminTab('edit-sub-event')
    setActiveDataTab('sub-events')
  }

  function cancelSubEventEdit() {
    setSelectedSubEvent({ eventId: '', subEventId: '' })
    setSubEventEditForm(getSubEventEditForm(null, eventHalls))
    setActiveAdminTab('create-sub-event')
  }

  async function handleUpdateSubEvent(event) {
    event.preventDefault()

    if (!selectedSubEvent.eventId || !selectedSubEvent.subEventId) {
      onNotice('error', 'Select a sub-event to edit.')
      return
    }
    if (!subEventEditForm.name || !subEventEditForm.date || !subEventEditForm.hall || !subEventEditForm.capacity) {
      onNotice('error', 'Sub-event name, date, hall, and capacity are required.')
      return
    }
    if (Number(subEventEditForm.capacity) < 1) {
      onNotice('error', 'Sub-event capacity must be at least 1.')
      return
    }
    if (subEventEditForm.feePerFamily && Number(subEventEditForm.feePerFamily) < 0) {
      onNotice('error', 'Sub-event fee cannot be negative.')
      return
    }

    setLoading(true)
    try {
      const response = await apiRequest(
        `/events/${selectedSubEvent.eventId}/sub-events/${selectedSubEvent.subEventId}`,
        {
          method: 'PATCH',
          token: authToken,
          body: {
            name: subEventEditForm.name,
            date: subEventEditForm.date,
            hall: subEventEditForm.hall,
            capacity: Number(subEventEditForm.capacity),
            feePerFamily: Number(subEventEditForm.feePerFamily || 0),
            notes: subEventEditForm.notes,
          },
        },
      )

      mergeUpdatedEvent(response.event)
      setActiveDataTab('sub-events')
      onNotice('success', `Sub-event ${response.subEvent.id} updated.`)
      cancelSubEventEdit()
    } catch (error) {
      onNotice('error', error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteSubEvent(parentEventId, subEventId) {
    const confirmed = window.confirm('Delete this sub-event?')
    if (!confirmed) return

    setLoading(true)
    try {
      const response = await apiRequest(`/events/${parentEventId}/sub-events/${subEventId}`, {
        method: 'DELETE',
        token: authToken,
      })

      mergeUpdatedEvent(response.event)
      if (selectedSubEvent.eventId === parentEventId && selectedSubEvent.subEventId === subEventId) {
        cancelSubEventEdit()
      }
      onNotice('success', `Sub-event ${response.deletedSubEvent.id} deleted.`)
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
      setActiveDataTab('registrations')

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
    setActiveDataTab('verification')
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
        current.map((intent) =>
          intent.id === selectedPaymentIntent.id ? response.paymentIntent : intent,
        ),
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
    <section className="panel-grid events-page">
      <article className="panel events-shell">
        <div className="events-shell-head">
          <div className="panel-head">
            <h2>Event Operations Center</h2>
            <p>Plan parent events, manage sub-events, and control registrations from one place.</p>
          </div>

          <div className="events-shell-actions">
            <div className="events-live-state" aria-live="polite">
              <span className={`events-live-dot${loading || intentsLoading ? ' is-loading' : ''}`} />
              {loading || intentsLoading ? 'Sync in progress' : 'Live data'}
            </div>
            <button
              type="button"
              className="secondary-btn"
              onClick={refreshDashboard}
              disabled={loading || intentsLoading}
            >
              Refresh Dashboard
            </button>
          </div>
        </div>

        <div className="events-overview-grid">
          <div className="events-overview-card">
            <span>Total Events</span>
            <strong>{events.length}</strong>
            <small>{overview.upcoming} upcoming</small>
          </div>
          <div className="events-overview-card is-muted">
            <span>Sub-Events</span>
            <strong>{subEvents.length}</strong>
            <small>Across all parent events</small>
          </div>
          <div className="events-overview-card is-warning">
            <span>Pending Registrations</span>
            <strong>{overview.pendingRegistrations}</strong>
            <small>{overview.pendingProofs} payment proofs pending</small>
          </div>
          <div className="events-overview-card is-success">
            <span>Seats Filled</span>
            <strong>
              {overview.totalBooked}/{overview.totalCapacity || 0}
            </strong>
            <small>{overview.checkedIn} families checked in</small>
          </div>
        </div>

        {permissions.manageEvents ? (
          <>
            <div className="events-form-tabs" role="tablist" aria-label="Event management forms">
              <button
                type="button"
                className={`events-tab-btn${activeAdminTab === 'create-event' ? ' active' : ''}`}
                onClick={() => setActiveAdminTab('create-event')}
              >
                Create Event
              </button>
              <button
                type="button"
                className={`events-tab-btn${activeAdminTab === 'register-family' ? ' active' : ''}`}
                onClick={() => setActiveAdminTab('register-family')}
              >
                Register Family
              </button>
              <button
                type="button"
                className={`events-tab-btn${activeAdminTab === 'create-sub-event' ? ' active' : ''}`}
                onClick={() => setActiveAdminTab('create-sub-event')}
              >
                Create Sub-Event
              </button>
              <button
                type="button"
                className={`events-tab-btn${activeAdminTab === 'edit-sub-event' ? ' active' : ''}`}
                onClick={() => setActiveAdminTab('edit-sub-event')}
                disabled={!selectedSubEvent.subEventId}
              >
                Edit Sub-Event
              </button>
            </div>

            {activeAdminTab === 'create-event' ? (
              <form className="stack-form events-form-grid" onSubmit={handleCreateEvent}>
                <label>
                  Event Name
                  <input
                    value={eventForm.name}
                    onChange={(event) =>
                      setEventForm((current) => ({ ...current, name: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Date
                  <input
                    type="date"
                    value={eventForm.date}
                    onChange={(event) =>
                      setEventForm((current) => ({ ...current, date: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Hall
                  <select
                    value={eventForm.hall}
                    onChange={(event) =>
                      setEventForm((current) => ({ ...current, hall: event.target.value }))
                    }
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
                    onChange={(event) =>
                      setEventForm((current) => ({ ...current, capacity: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Fee Per Family (INR)
                  <input
                    type="number"
                    min="0"
                    value={eventForm.feePerFamily}
                    onChange={(event) =>
                      setEventForm((current) => ({ ...current, feePerFamily: event.target.value }))
                    }
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
                <label className="events-form-span-2">
                  Notes
                  <textarea
                    value={eventForm.notes}
                    onChange={(event) =>
                      setEventForm((current) => ({ ...current, notes: event.target.value }))
                    }
                  />
                </label>
                <div className="action-row events-form-span-2">
                  <button type="submit" disabled={loading}>
                    Create Event
                  </button>
                </div>
              </form>
            ) : null}

            {activeAdminTab === 'register-family' ? (
              <form className="stack-form events-form-grid" onSubmit={handleRegister}>
                <label>
                  Event
                  <select
                    value={registerForm.eventId}
                    onChange={(event) =>
                      setRegisterForm((current) => ({ ...current, eventId: event.target.value }))
                    }
                    disabled={!events.length}
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
                    onChange={(event) =>
                      setRegisterForm((current) => ({ ...current, familyId: event.target.value }))
                    }
                    disabled={!families.length}
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
                    onChange={(event) =>
                      setRegisterForm((current) => ({ ...current, seats: event.target.value }))
                    }
                  />
                </label>
                <label className="events-form-span-2">
                  Notes
                  <input
                    value={registerForm.notes}
                    onChange={(event) =>
                      setRegisterForm((current) => ({ ...current, notes: event.target.value }))
                    }
                  />
                </label>
                <div className="action-row events-form-span-2">
                  <button type="submit" disabled={loading || !events.length || !families.length}>
                    Register Family
                  </button>
                </div>
              </form>
            ) : null}

            {activeAdminTab === 'create-sub-event' ? (
              <form className="stack-form events-form-grid" onSubmit={handleCreateSubEvent}>
                <label>
                  Parent Event
                  <select
                    value={subEventForm.parentEventId}
                    onChange={(event) => updateSubEventParent(event.target.value)}
                    disabled={loading || events.length === 0}
                  >
                    {events.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({formatDate(item.date)})
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Sub-Event Name
                  <input
                    value={subEventForm.name}
                    onChange={(event) =>
                      setSubEventForm((current) => ({ ...current, name: event.target.value }))
                    }
                    disabled={loading || events.length === 0}
                  />
                </label>
                <label>
                  Date
                  <input
                    type="date"
                    value={subEventForm.date}
                    onChange={(event) =>
                      setSubEventForm((current) => ({ ...current, date: event.target.value }))
                    }
                    disabled={loading || events.length === 0}
                  />
                </label>
                <label>
                  Hall
                  <select
                    value={subEventForm.hall}
                    onChange={(event) =>
                      setSubEventForm((current) => ({ ...current, hall: event.target.value }))
                    }
                    disabled={loading || events.length === 0}
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
                    value={subEventForm.capacity}
                    onChange={(event) =>
                      setSubEventForm((current) => ({ ...current, capacity: event.target.value }))
                    }
                    disabled={loading || events.length === 0}
                  />
                </label>
                <label>
                  Fee Per Family (INR)
                  <input
                    type="number"
                    min="0"
                    value={subEventForm.feePerFamily}
                    onChange={(event) =>
                      setSubEventForm((current) => ({ ...current, feePerFamily: event.target.value }))
                    }
                    disabled={loading || events.length === 0}
                  />
                </label>
                <label className="events-form-span-2">
                  Notes
                  <textarea
                    value={subEventForm.notes}
                    onChange={(event) =>
                      setSubEventForm((current) => ({ ...current, notes: event.target.value }))
                    }
                    disabled={loading || events.length === 0}
                  />
                </label>
                <div className="action-row events-form-span-2">
                  <button type="submit" disabled={loading || events.length === 0}>
                    Create Sub-Event
                  </button>
                </div>
              </form>
            ) : null}

            {activeAdminTab === 'edit-sub-event' ? (
              selectedSubEvent.subEventId ? (
                <form className="stack-form events-form-grid" onSubmit={handleUpdateSubEvent}>
                  <label>
                    Sub-Event Name
                    <input
                      value={subEventEditForm.name}
                      onChange={(event) =>
                        setSubEventEditForm((current) => ({ ...current, name: event.target.value }))
                      }
                      disabled={loading}
                    />
                  </label>
                  <label>
                    Date
                    <input
                      type="date"
                      value={subEventEditForm.date}
                      onChange={(event) =>
                        setSubEventEditForm((current) => ({ ...current, date: event.target.value }))
                      }
                      disabled={loading}
                    />
                  </label>
                  <label>
                    Hall
                    <select
                      value={subEventEditForm.hall}
                      onChange={(event) =>
                        setSubEventEditForm((current) => ({ ...current, hall: event.target.value }))
                      }
                      disabled={loading}
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
                      value={subEventEditForm.capacity}
                      onChange={(event) =>
                        setSubEventEditForm((current) => ({ ...current, capacity: event.target.value }))
                      }
                      disabled={loading}
                    />
                  </label>
                  <label>
                    Fee Per Family (INR)
                    <input
                      type="number"
                      min="0"
                      value={subEventEditForm.feePerFamily}
                      onChange={(event) =>
                        setSubEventEditForm((current) => ({ ...current, feePerFamily: event.target.value }))
                      }
                      disabled={loading}
                    />
                  </label>
                  <label className="events-form-span-2">
                    Notes
                    <textarea
                      value={subEventEditForm.notes}
                      onChange={(event) =>
                        setSubEventEditForm((current) => ({ ...current, notes: event.target.value }))
                      }
                      disabled={loading}
                    />
                  </label>
                  <div className="action-row events-form-span-2">
                    <button type="submit" disabled={loading}>
                      Save Sub-Event
                    </button>
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={cancelSubEventEdit}
                      disabled={loading}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <p className="hint">
                  Select any sub-event from the Sub-Events tab and click Edit to load it here.
                </p>
              )
            ) : null}
          </>
        ) : (
          <p className="hint">Read-only event visibility for this role.</p>
        )}
      </article>

      <article className="panel events-data-card">
        <div className="panel-head">
          <h2>Event Data Hub</h2>
          <p>Browse events, sub-events, registrations, and payment verification with focused views.</p>
        </div>

        <div className="events-content-tabs" role="tablist" aria-label="Event data tabs">
          <button
            type="button"
            className={`events-tab-btn${activeDataTab === 'events' ? ' active' : ''}`}
            onClick={() => setActiveDataTab('events')}
          >
            Events ({filteredEvents.length})
          </button>
          <button
            type="button"
            className={`events-tab-btn${activeDataTab === 'sub-events' ? ' active' : ''}`}
            onClick={() => setActiveDataTab('sub-events')}
          >
            Sub-Events ({subEvents.length})
          </button>
          <button
            type="button"
            className={`events-tab-btn${activeDataTab === 'registrations' ? ' active' : ''}`}
            onClick={() => setActiveDataTab('registrations')}
          >
            Registrations ({filteredRegistrations.length})
          </button>
          <button
            type="button"
            className={`events-tab-btn${activeDataTab === 'verification' ? ' active' : ''}`}
            onClick={() => setActiveDataTab('verification')}
          >
            Verification {selectedRegistration ? `(${selectedRegistration.id})` : ''}
          </button>
        </div>

        <div className="events-toolbar">
          <label className="events-toolbar-field">
            Search
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by id, name, hall, family, status"
            />
          </label>

          {activeDataTab === 'registrations' ? (
            <label className="events-toolbar-field">
              Registration State
              <select
                value={registrationFilter}
                onChange={(event) => setRegistrationFilter(event.target.value)}
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="checked-in">Checked-In</option>
              </select>
            </label>
          ) : (
            <div className="events-toolbar-field">
              <span>Quick Insight</span>
              <small className="hint">{overview.pendingRegistrations} registrations still pending approval.</small>
            </div>
          )}

          <div className="events-toolbar-actions">
            <button type="button" className="secondary-btn" onClick={refreshDashboard} disabled={loading || intentsLoading}>
              Refresh
            </button>
            {activeDataTab === 'verification' && canViewPaymentIntents ? (
              <button
                type="button"
                className="secondary-btn"
                onClick={() => loadPaymentIntents()}
                disabled={loading || intentsLoading}
              >
                {intentsLoading ? 'Refreshing...' : 'Refresh Payment Details'}
              </button>
            ) : null}
          </div>
        </div>

        {activeDataTab === 'events' ? (
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
                  <th>Sub-Events</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan="8">No events found for current filters.</td>
                  </tr>
                ) : (
                  filteredEvents.map((event) => (
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
                      <td>{Array.isArray(event.subEvents) ? event.subEvents.length : 0}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : null}

        {activeDataTab === 'sub-events' ? (
          <div className="table-wrap compact">
            <table>
              <thead>
                <tr>
                  <th>Sub-Event ID</th>
                  <th>Parent Event</th>
                  <th>Name</th>
                  <th>Date</th>
                  <th>Hall</th>
                  <th>Capacity</th>
                  <th>Fee</th>
                  <th>Notes</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubEvents.length === 0 ? (
                  <tr>
                    <td colSpan="9">No sub-events found for current filters.</td>
                  </tr>
                ) : (
                  filteredSubEvents.map((subEvent) => (
                    <tr key={`${subEvent.parentEventId}-${subEvent.id}`}>
                      <td>{subEvent.id}</td>
                      <td>{subEvent.parentEventName}</td>
                      <td>{subEvent.name}</td>
                      <td>{formatDate(subEvent.date)}</td>
                      <td>{subEvent.hall}</td>
                      <td>{subEvent.capacity || '-'}</td>
                      <td>{formatCurrency(subEvent.feePerFamily)}</td>
                      <td>{subEvent.notes || '-'}</td>
                      <td>
                        {permissions.manageEvents ? (
                          <div className="action-row table-action-row">
                            <button
                              type="button"
                              className="secondary-btn"
                              onClick={() => beginSubEventEdit(subEvent.parentEventId, subEvent)}
                              disabled={loading}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="secondary-btn"
                              onClick={() => handleDeleteSubEvent(subEvent.parentEventId, subEvent.id)}
                              disabled={loading}
                            >
                              Delete
                            </button>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : null}

        {activeDataTab === 'registrations' ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Registration ID</th>
                  <th>Event</th>
                  <th>Family</th>
                  <th>Seats</th>
                  <th>State</th>
                  <th>Payment</th>
                  <th>Approval</th>
                  <th>Pledge TXN</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRegistrations.length === 0 ? (
                  <tr>
                    <td colSpan="9">No registrations found for current filters.</td>
                  </tr>
                ) : (
                  filteredRegistrations.map((registration) => {
                    const registrationState = getRegistrationState(registration)

                    return (
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
                        <td>
                          <span className={`events-state-badge is-${registrationState}`}>
                            {getRegistrationStateLabel(registrationState)}
                          </span>
                        </td>
                        <td>{registration.paymentStatus || '-'}</td>
                        <td>{registration.approvalStatus || '-'}</td>
                        <td>{registration.transactionId || '-'}</td>
                        <td>
                          <div className="action-row table-action-row">
                            <button
                              type="button"
                              className="secondary-btn"
                              onClick={(event) => {
                                event.stopPropagation()
                                openVerification(registration.id)
                              }}
                              disabled={loading}
                            >
                              Verify
                            </button>
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
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : null}

        {activeDataTab === 'verification' ? (
          <div className="registration-verify-panel events-verify-panel">
            <div className="panel-head">
              <h3>Registration Verification</h3>
              <p>Inspect payment proof and approve or reject directly from this panel.</p>
            </div>

            <label className="events-verify-select">
              Registration
              <select
                value={selectedRegistrationId}
                onChange={(event) => openVerification(event.target.value)}
                disabled={registrations.length === 0}
              >
                <option value="">Select a registration</option>
                {registrations.map((registration) => (
                  <option key={registration.id} value={registration.id}>
                    {registration.id} - {eventLookup[registration.eventId]?.name || registration.eventId}
                  </option>
                ))}
              </select>
            </label>

            {!selectedRegistration ? (
              <p className="hint">Select any registration to view payment proof and settlement actions.</p>
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
                  {['Pending', 'Proof Submitted'].includes(selectedPaymentIntent?.status) &&
                  permissions.reconcilePayments ? (
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
        ) : null}
      </article>
    </section>
  )
}
