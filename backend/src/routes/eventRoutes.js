const express = require('express')
const { authorize, authorizeAny } = require('../middleware/authorize')
const { getDb, saveDb } = require('../store/db')
const { EVENT_HALLS } = require('../constants/domain')
const { badRequest, notFound } = require('../utils/http')
const { ensurePositiveInteger, ensurePositiveNumber, ensureRequiredString } = require('../utils/validation')
const { createId } = require('../utils/ids')

const router = express.Router()

function withSeatStats(events, registrations) {
  return events.map((event) => {
    const seatsBooked = registrations
      .filter((registration) => registration.eventId === event.id)
      .reduce((sum, registration) => sum + (Number(registration.seats) || 0), 0)

    return {
      ...event,
      seatsBooked,
      seatsAvailable: Math.max(0, (Number(event.capacity) || 0) - seatsBooked),
    }
  })
}

router.get('/', authorizeAny(['manageEvents', 'viewSchedule', 'accessDevoteePortal']), (req, res) => {
  const db = getDb()
  const events = withSeatStats(db.events || [], db.eventRegistrations || []).sort((a, b) =>
    String(a.date).localeCompare(String(b.date)),
  )

  res.json({
    halls: EVENT_HALLS,
    events,
    registrations: db.eventRegistrations || [],
  })
})

router.post('/', authorize('manageEvents'), async (req, res, next) => {
  try {
    const db = getDb()
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

    const event = {
      id: createId('EVT'),
      name,
      date,
      hall,
      capacity,
      feePerFamily,
      resourceRequirements,
      notes,
      createdAt: new Date().toISOString(),
      createdBy: req.user.fullName,
    }

    db.events.unshift(event)
    await saveDb()

    return res.status(201).json({ event })
  } catch (error) {
    return next(error)
  }
})

router.post('/:eventId/register', authorizeAny(['manageEvents', 'accessDevoteePortal']), async (req, res, next) => {
  try {
    const db = getDb()
    const event = db.events.find((item) => item.id === req.params.eventId)
    if (!event) throw notFound('Event not found.')

    const familyId = ensureRequiredString(req.body?.familyId)
    const seats = ensurePositiveInteger(req.body?.seats)
    const notes = ensureRequiredString(req.body?.notes)

    if (!familyId || !seats) {
      throw badRequest('familyId and seats are required.')
    }
    if (!db.families.some((family) => family.familyId === familyId)) {
      throw badRequest('Family profile not found.')
    }

    const duplicate = db.eventRegistrations.find(
      (registration) => registration.eventId === event.id && registration.familyId === familyId,
    )
    if (duplicate) {
      throw badRequest('This family is already registered for the event.')
    }

    const seatsBooked = db.eventRegistrations
      .filter((registration) => registration.eventId === event.id)
      .reduce((sum, registration) => sum + (Number(registration.seats) || 0), 0)

    if (seatsBooked + seats > event.capacity) {
      throw badRequest('Not enough seats available for this event.')
    }

    const registration = {
      id: createId('REG'),
      eventId: event.id,
      familyId,
      seats,
      notes,
      registeredAt: new Date().toISOString(),
      checkedInAt: '',
      paymentStatus: event.feePerFamily > 0 ? 'Pending' : 'Not Required',
      transactionId: '',
    }

    let transaction = null
    if (event.feePerFamily > 0) {
      transaction = {
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
      }
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
    const registration = db.eventRegistrations.find((item) => item.id === req.params.registrationId)
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
