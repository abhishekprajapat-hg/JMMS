const express = require('express')
const { authorize } = require('../middleware/authorize')
const { getDb, saveDb } = require('../store/db')
const { POOJA_SLOTS } = require('../constants/domain')
const { badRequest } = require('../utils/http')
const { createId } = require('../utils/ids')
const { ensureRequiredString } = require('../utils/validation')
const { parseCsv, toCsv } = require('../utils/csv')
const {
  normalizeBookingRange,
  withNormalizedBookingRange,
  doesBookingRangeOverlap,
} = require('../utils/bookingRange')
const { resolveMandirId, filterByMandir, withMandir, getRecordMandirId } = require('../services/tenantService')

const router = express.Router()

function canBypass(req) {
  return req.user.role === 'trustee' && Boolean(req.body?.trusteeOverride)
}

router.get('/bookings', authorize('viewSchedule'), (req, res) => {
  const db = getDb()
  const mandirId = resolveMandirId(req, db)
  const bookings = filterByMandir(db.poojaBookings, mandirId).map((booking) => withNormalizedBookingRange(booking))
  res.json({
    slots: POOJA_SLOTS,
    bookings,
    mandirId,
  })
})

router.get('/bookings/export/csv', authorize('viewSchedule'), (req, res) => {
  const db = getDb()
  const mandirId = resolveMandirId(req, db)
  const bookings = filterByMandir(db.poojaBookings, mandirId).map((booking) => withNormalizedBookingRange(booking))
  const payload = toCsv(bookings, ['id', 'date', 'startDate', 'endDate', 'slot', 'familyId', 'notes', 'overridden'])
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="pooja_bookings.csv"')
  res.send(payload)
})

router.post('/bookings/import/csv', authorize('manageSchedule'), async (req, res, next) => {
  try {
    const db = getDb()
    const mandirId = resolveMandirId(req, db)
    const tenantFamilies = filterByMandir(db.families, mandirId)
    const tenantBookings = filterByMandir(db.poojaBookings, mandirId)
    const csvData = String(req.body?.csvData || '')
    const mode = ensureRequiredString(req.body?.mode).toLowerCase() || 'append'

    if (!csvData.trim()) {
      throw badRequest('csvData is required.')
    }
    if (!['append', 'upsert'].includes(mode)) {
      throw badRequest('mode must be append or upsert.')
    }

    const rows = parseCsv(csvData)
    if (!rows.length) {
      throw badRequest('CSV has no data rows.')
    }

    let created = 0
    let updated = 0
    let skipped = 0
    const errors = []

    for (const [index, row] of rows.entries()) {
      const slot = ensureRequiredString(row.slot || row.Slot)
      const familyId = ensureRequiredString(row.familyId || row['Family ID'])
      const notes = ensureRequiredString(row.notes || row.Notes)
      const providedId = ensureRequiredString(row.id || row['Booking ID'])
      const range = normalizeBookingRange({
        date: row.date || row.Date,
        startDate: row.startDate || row['Start Date'],
        endDate: row.endDate || row['End Date'],
      })

      if (!range || !slot || !familyId) {
        errors.push(`Row ${index + 2}: date/startDate/endDate, slot, and familyId are required.`)
        skipped += 1
        continue
      }
      if (!POOJA_SLOTS.includes(slot)) {
        errors.push(`Row ${index + 2}: Invalid pooja slot.`)
        skipped += 1
        continue
      }
      if (!tenantFamilies.some((family) => family.familyId === familyId)) {
        errors.push(`Row ${index + 2}: Family profile not found.`)
        skipped += 1
        continue
      }

      const existingById = providedId ? tenantBookings.find((item) => item.id === providedId) : null
      const existingByRange = tenantBookings.find(
        (item) =>
          item.slot === slot &&
          (!existingById || item.id !== existingById.id) &&
          doesBookingRangeOverlap(range, item),
      )
      const existing = existingById || existingByRange

      if (existingById) {
        const overlappingOther = tenantBookings.find(
          (item) => item.id !== existingById.id && item.slot === slot && doesBookingRangeOverlap(range, item),
        )
        if (overlappingOther) {
          errors.push(`Row ${index + 2}: selected date range overlaps with another booking for this slot.`)
          skipped += 1
          continue
        }
      }

      if (existing && mode !== 'upsert') {
        skipped += 1
        continue
      }

      if (existing) {
        Object.assign(existing, {
          ...range,
          slot,
          familyId,
          notes,
          overridden: false,
        })
        updated += 1
      } else {
        const booking = withMandir({
          id: providedId || createId('POO'),
          ...range,
          slot,
          familyId,
          notes,
          overridden: false,
        }, mandirId)
        db.poojaBookings.unshift(booking)
        tenantBookings.unshift(booking)
        created += 1
      }
    }

    if (created || updated) {
      await saveDb()
    }

    return res.json({
      totalRows: rows.length,
      created,
      updated,
      skipped,
      errors,
    })
  } catch (error) {
    return next(error)
  }
})

router.post('/bookings', authorize('manageSchedule'), async (req, res, next) => {
  try {
    const db = getDb()
    const mandirId = resolveMandirId(req, db)
    const range = normalizeBookingRange({
      date: req.body?.date,
      startDate: req.body?.startDate,
      endDate: req.body?.endDate,
    })
    const slot = ensureRequiredString(req.body?.slot)
    const familyId = ensureRequiredString(req.body?.familyId)
    const notes = ensureRequiredString(req.body?.notes)

    if (!range || !slot || !familyId) {
      throw badRequest('date (or startDate/endDate), slot, and familyId are required.')
    }
    if (!POOJA_SLOTS.includes(slot)) {
      throw badRequest('Invalid pooja slot.')
    }
    if (!db.families.some((family) => family.familyId === familyId && getRecordMandirId(family) === mandirId)) {
      throw badRequest('Family profile not found.')
    }

    const conflict = db.poojaBookings.find(
      (booking) =>
        booking.slot === slot &&
        getRecordMandirId(booking) === mandirId &&
        doesBookingRangeOverlap(range, booking),
    )
    if (conflict && !canBypass(req)) {
      throw badRequest('This pooja slot is already booked within the selected date range.')
    }

    const booking = withMandir({
      id: createId('POO'),
      ...range,
      slot,
      familyId,
      notes,
      overridden: Boolean(conflict && canBypass(req)),
    }, mandirId)
    db.poojaBookings.unshift(booking)
    await saveDb()

    return res.status(201).json({ booking: withNormalizedBookingRange(booking) })
  } catch (error) {
    return next(error)
  }
})

module.exports = { schedulerRoutes: router }
