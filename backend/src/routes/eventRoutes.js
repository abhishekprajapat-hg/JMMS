const express = require('express')
const { authorize, authorizeAny } = require('../middleware/authorize')
const { getDb, saveDb } = require('../store/db')
const { EVENT_HALLS } = require('../constants/domain')
const { badRequest, notFound } = require('../utils/http')
const { ensurePositiveInteger, ensurePositiveNumber, ensureRequiredString } = require('../utils/validation')
const { createId } = require('../utils/ids')
const { resolveMandirId, filterByMandir, withMandir, getRecordMandirId } = require('../services/tenantService')
const {
  getEventSeatsBooked,
  findEventRegistration,
} = require('../services/eventRegistrationService')

const router = express.Router()

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== ''
}

function ensureNonNegativeNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : null
}

function normalizeSubEvents(event) {
  if (!Array.isArray(event?.subEvents)) return []
  return event.subEvents
    .map((subEvent) => ({
      ...subEvent,
      feePerFamily: ensureNonNegativeNumber(subEvent.feePerFamily) || 0,
    }))
    .sort((left, right) => {
      const dateCompare = String(left.date || '').localeCompare(String(right.date || ''))
      if (dateCompare !== 0) return dateCompare
      return String(left.name || '').localeCompare(String(right.name || ''))
    })
}

function findTenantEvent(db, { eventId, mandirId }) {
  return db.events.find((item) => item.id === eventId && getRecordMandirId(item) === mandirId) || null
}

function formatEventResponse(event, registrations) {
  return withSeatStats([event], registrations).map((item) => ({
    ...item,
    subEvents: normalizeSubEvents(item),
  }))[0]
}

function withSeatStats(events, registrations) {
  return events.map((event) => {
    const seatsBooked = getEventSeatsBooked(registrations, {
      eventId: event.id,
      mandirId: getRecordMandirId(event),
    })

    return {
      ...event,
      seatsBooked,
      seatsAvailable: Math.max(0, (Number(event.capacity) || 0) - seatsBooked),
    }
  })
}

router.get('/', authorizeAny(['manageEvents', 'viewSchedule', 'accessDevoteePortal']), (req, res) => {
  const db = getDb()
  const mandirId = resolveMandirId(req, db)
  const tenantEvents = filterByMandir(db.events, mandirId)
  const tenantRegistrations = filterByMandir(db.eventRegistrations, mandirId)
  const events = withSeatStats(tenantEvents, tenantRegistrations)
    .map((event) => ({
      ...event,
      subEvents: normalizeSubEvents(event),
    }))
    .sort((a, b) =>
    String(a.date).localeCompare(String(b.date)),
    )

  res.json({
    halls: EVENT_HALLS,
    events,
    registrations: tenantRegistrations,
    mandirId,
  })
})

router.post('/', authorize('manageEvents'), async (req, res, next) => {
  try {
    const db = getDb()
    const mandirId = resolveMandirId(req, db)
    const name = ensureRequiredString(req.body?.name)
    const date = ensureRequiredString(req.body?.date)
    const hall = ensureRequiredString(req.body?.hall)
    const capacity = ensurePositiveInteger(req.body?.capacity)
    const feePerFamily = ensurePositiveNumber(req.body?.feePerFamily) || 0
    const notes = ensureRequiredString(req.body?.notes)
    const resourceRequirements = Array.isArray(req.body?.resourceRequirements)
      ? req.body.resourceRequirements.map((value) => ensureRequiredString(value)).filter(Boolean)
      : []

    if (!name || !date || !hall || !capacity) {
      throw badRequest('name, date, hall, and capacity are required.')
    }
    if (!EVENT_HALLS.includes(hall)) {
      throw badRequest('Invalid hall selection.')
    }

    const event = withMandir({
      id: createId('EVT'),
      name,
      date,
      hall,
      capacity,
      feePerFamily,
      resourceRequirements,
      notes,
      subEvents: [],
      createdAt: new Date().toISOString(),
      createdBy: req.user.fullName,
    }, mandirId)

    db.events.unshift(event)
    await saveDb()

    return res.status(201).json({ event })
  } catch (error) {
    return next(error)
  }
})

router.post('/:eventId/sub-events', authorize('manageEvents'), async (req, res, next) => {
  try {
    const db = getDb()
    const mandirId = resolveMandirId(req, db)
    const parentEvent = findTenantEvent(db, {
      eventId: req.params.eventId,
      mandirId,
    })
    if (!parentEvent) throw notFound('Event not found.')

    const name = ensureRequiredString(req.body?.name)
    const date = ensureRequiredString(req.body?.date) || parentEvent.date
    const hall = ensureRequiredString(req.body?.hall) || parentEvent.hall
    const capacityInput = req.body?.capacity
    const capacity = hasValue(capacityInput)
      ? ensurePositiveInteger(capacityInput)
      : ensurePositiveInteger(parentEvent.capacity)
    const feeInput = req.body?.feePerFamily
    const feePerFamily = hasValue(feeInput)
      ? ensureNonNegativeNumber(feeInput)
      : 0
    const notes = ensureRequiredString(req.body?.notes)

    if (!name) {
      throw badRequest('Sub-event name is required.')
    }
    if (!date || !hall || !capacity) {
      throw badRequest('Sub-event date, hall, and capacity are required.')
    }
    if (hasValue(capacityInput) && !capacity) {
      throw badRequest('Sub-event capacity must be a positive integer.')
    }
    if (!EVENT_HALLS.includes(hall)) {
      throw badRequest('Invalid hall selection.')
    }
    if (hasValue(feeInput) && feePerFamily === null) {
      throw badRequest('Sub-event fee must be a non-negative number.')
    }

    const subEvent = {
      id: createId('SUB'),
      name,
      date,
      hall,
      capacity,
      feePerFamily: feePerFamily ?? 0,
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: req.user?.fullName || req.user?.username || 'staff_console',
      updatedBy: req.user?.fullName || req.user?.username || 'staff_console',
    }

    if (!Array.isArray(parentEvent.subEvents)) {
      parentEvent.subEvents = []
    }
    parentEvent.subEvents.unshift(subEvent)
    await saveDb()

    const tenantRegistrations = filterByMandir(db.eventRegistrations, mandirId)
    return res.status(201).json({
      subEvent,
      event: formatEventResponse(parentEvent, tenantRegistrations),
    })
  } catch (error) {
    return next(error)
  }
})

router.patch('/:eventId/sub-events/:subEventId', authorize('manageEvents'), async (req, res, next) => {
  try {
    const db = getDb()
    const mandirId = resolveMandirId(req, db)
    const parentEvent = findTenantEvent(db, {
      eventId: req.params.eventId,
      mandirId,
    })
    if (!parentEvent) throw notFound('Event not found.')

    if (!Array.isArray(parentEvent.subEvents)) {
      parentEvent.subEvents = []
    }

    const subEvent = parentEvent.subEvents.find((item) => item.id === req.params.subEventId)
    if (!subEvent) {
      throw notFound('Sub-event not found.')
    }

    const nameInput = req.body?.name
    const dateInput = req.body?.date
    const hallInput = req.body?.hall
    const capacityInput = req.body?.capacity
    const feeInput = req.body?.feePerFamily
    const notesInput = req.body?.notes
    const hasNotesInput = notesInput !== undefined && notesInput !== null

    if (hasValue(capacityInput) && !ensurePositiveInteger(capacityInput)) {
      throw badRequest('Sub-event capacity must be a positive integer.')
    }

    if (hasValue(feeInput) && ensureNonNegativeNumber(feeInput) === null) {
      throw badRequest('Sub-event fee must be a non-negative number.')
    }

    const nextName = hasValue(nameInput) ? ensureRequiredString(nameInput) : subEvent.name
    const nextDate = hasValue(dateInput) ? ensureRequiredString(dateInput) : (subEvent.date || parentEvent.date)
    const nextHall = hasValue(hallInput) ? ensureRequiredString(hallInput) : (subEvent.hall || parentEvent.hall)
    const nextCapacity = hasValue(capacityInput)
      ? ensurePositiveInteger(capacityInput)
      : (ensurePositiveInteger(subEvent.capacity) || ensurePositiveInteger(parentEvent.capacity))
    const nextFeePerFamily = hasValue(feeInput)
      ? ensureNonNegativeNumber(feeInput)
      : (ensureNonNegativeNumber(subEvent.feePerFamily) || 0)
    const nextNotes = hasNotesInput ? ensureRequiredString(notesInput) : ensureRequiredString(subEvent.notes)

    if (!nextName || !nextDate || !nextHall || !nextCapacity) {
      throw badRequest('Sub-event name, date, hall, and capacity are required.')
    }
    if (!EVENT_HALLS.includes(nextHall)) {
      throw badRequest('Invalid hall selection.')
    }

    subEvent.name = nextName
    subEvent.date = nextDate
    subEvent.hall = nextHall
    subEvent.capacity = nextCapacity
    subEvent.feePerFamily = nextFeePerFamily ?? 0
    subEvent.notes = nextNotes
    subEvent.updatedAt = new Date().toISOString()
    subEvent.updatedBy = req.user?.fullName || req.user?.username || 'staff_console'

    await saveDb()

    const tenantRegistrations = filterByMandir(db.eventRegistrations, mandirId)
    return res.json({
      subEvent,
      event: formatEventResponse(parentEvent, tenantRegistrations),
    })
  } catch (error) {
    return next(error)
  }
})

router.delete('/:eventId/sub-events/:subEventId', authorize('manageEvents'), async (req, res, next) => {
  try {
    const db = getDb()
    const mandirId = resolveMandirId(req, db)
    const parentEvent = findTenantEvent(db, {
      eventId: req.params.eventId,
      mandirId,
    })
    if (!parentEvent) throw notFound('Event not found.')

    if (!Array.isArray(parentEvent.subEvents)) {
      parentEvent.subEvents = []
    }

    const subEventIndex = parentEvent.subEvents.findIndex((item) => item.id === req.params.subEventId)
    if (subEventIndex < 0) {
      throw notFound('Sub-event not found.')
    }

    const [deletedSubEvent] = parentEvent.subEvents.splice(subEventIndex, 1)
    await saveDb()

    const tenantRegistrations = filterByMandir(db.eventRegistrations, mandirId)
    return res.json({
      deletedSubEvent,
      event: formatEventResponse(parentEvent, tenantRegistrations),
    })
  } catch (error) {
    return next(error)
  }
})

router.post('/:eventId/register', authorizeAny(['manageEvents', 'accessDevoteePortal']), async (req, res, next) => {
  try {
    const db = getDb()
    const mandirId = resolveMandirId(req, db)
    const event = db.events.find((item) => item.id === req.params.eventId && getRecordMandirId(item) === mandirId)
    if (!event) throw notFound('Event not found.')

    const familyId = ensureRequiredString(req.body?.familyId)
    const seats = ensurePositiveInteger(req.body?.seats)
    const notes = ensureRequiredString(req.body?.notes)

    if (!familyId || !seats) {
      throw badRequest('familyId and seats are required.')
    }
    if (!db.families.some((family) => family.familyId === familyId && getRecordMandirId(family) === mandirId)) {
      throw badRequest('Family profile not found.')
    }

    const duplicate = findEventRegistration(db.eventRegistrations, {
      eventId: event.id,
      familyId,
      mandirId,
    })
    if (duplicate) {
      throw badRequest('This family is already registered for the event.')
    }

    const seatsBooked = getEventSeatsBooked(db.eventRegistrations, {
      eventId: event.id,
      mandirId,
    })

    if (seatsBooked + seats > event.capacity) {
      throw badRequest('Not enough seats available for this event.')
    }

    const registration = withMandir({
      id: createId('REG'),
      eventId: event.id,
      familyId,
      seats,
      notes,
      registeredAt: new Date().toISOString(),
      checkedInAt: '',
      paymentStatus: event.feePerFamily > 0 ? 'Pending' : 'Not Required',
      approvalStatus: event.feePerFamily > 0 ? 'Pending Payment' : 'Approved',
      transactionId: '',
      registeredBy: req.user?.username || req.user?.fullName || 'staff_console',
    }, mandirId)

    let transaction = null
    if (event.feePerFamily > 0) {
      transaction = withMandir({
        id: createId('TRX'),
        familyId,
        type: 'Boli',
        fundCategory: 'General Fund',
        status: 'Pledged',
        amount: event.feePerFamily * seats,
        createdAt: new Date().toISOString(),
        dueDate: event.date,
        paidAt: '',
        cancelled: false,
        cancellationReason: '',
        cancellationAt: '',
        receiptPath: '',
        receiptFileName: '',
        receiptGeneratedBy: '',
      }, mandirId)
      db.transactions.unshift(transaction)
      registration.transactionId = transaction.id
    }

    db.eventRegistrations.unshift(registration)
    await saveDb()

    return res.status(201).json({ registration, transaction })
  } catch (error) {
    return next(error)
  }
})

router.post('/registrations/:registrationId/checkin', authorize('manageEvents'), async (req, res, next) => {
  try {
    const db = getDb()
    const mandirId = resolveMandirId(req, db)
    const registration = db.eventRegistrations.find(
      (item) => item.id === req.params.registrationId && getRecordMandirId(item) === mandirId,
    )
    if (!registration) throw notFound('Registration not found.')

    if (!registration.checkedInAt) {
      registration.checkedInAt = new Date().toISOString()
      await saveDb()
    }

    return res.json({ registration })
  } catch (error) {
    return next(error)
  }
})

module.exports = { eventRoutes: router }
