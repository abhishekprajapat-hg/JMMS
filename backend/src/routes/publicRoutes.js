const express = require('express')
const { getDb } = require('../store/db')
const { ensureRequiredString } = require('../utils/validation')
const { badRequest } = require('../utils/http')
const { toISODate } = require('../utils/date')
const { toContentList, CONTENT_TYPES } = require('../services/contentService')
const { resolveMandirId, scopeDbByMandir, getMandirProfile } = require('../services/tenantService')

const router = express.Router()

router.get('/mandirs', (_req, res) => {
  const db = getDb()
  const primary = (db.mandirs || []).find((item) => item && item.isActive !== false) || null
  const mandirs = primary
    ? [
        {
          id: primary.id,
          name: primary.name,
          address: primary.address,
          timezone: primary.timezone || 'Asia/Kolkata',
        },
      ]
    : []
  return res.json({ mandirs })
})

function buildDonationSnapshot(db) {
  const paidTransactions = (db.transactions || []).filter((transaction) => transaction.status === 'Paid' && !transaction.cancelled)
  const totalAmount = paidTransactions.reduce((sum, transaction) => sum + (Number(transaction.amount) || 0), 0)
  const families = new Set(
    paidTransactions
      .map((transaction) => ensureRequiredString(transaction.familyId))
      .filter(Boolean),
  )
  return {
    totalAmount,
    donationCount: paidTransactions.length,
    supporterFamilies: families.size,
  }
}

function getUpcomingEvents(db) {
  const today = toISODate()
  return (db.events || [])
    .filter((event) => ensureRequiredString(event.date) >= today)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .slice(0, 6)
}

router.get('/home', (req, res) => {
  const db = getDb()
  const mandirId = resolveMandirId(req, db)
  const scopedDb = scopeDbByMandir(db, mandirId)
  const ebooks = toContentList(db, {
    includeUnpublished: false,
    type: 'ebook',
    mandirId,
  }).slice(0, 6)
  const videos = toContentList(db, {
    includeUnpublished: false,
    type: 'video',
    mandirId,
  }).slice(0, 6)
  const upcomingEvents = getUpcomingEvents(scopedDb)

  return res.json({
    mandirId,
    mandirProfile: getMandirProfile(db, mandirId),
    donationSnapshot: buildDonationSnapshot(scopedDb),
    featured: {
      ebooks,
      videos,
    },
    upcomingEvents,
  })
})

router.get('/library', (req, res) => {
  const db = getDb()
  const mandirId = resolveMandirId(req, db)
  const type = ensureRequiredString(req.query?.type).toLowerCase()
  if (type && !CONTENT_TYPES.includes(type)) {
    throw badRequest('type must be ebook or video.')
  }

  return res.json({
    items: toContentList(db, { includeUnpublished: false, type, mandirId }),
  })
})

module.exports = { publicRoutes: router }
