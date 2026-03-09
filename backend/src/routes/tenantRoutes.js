const express = require('express')
const { getDb, saveDb } = require('../store/db')
const { badRequest, forbidden, notFound } = require('../utils/http')
const { ensureRequiredString } = require('../utils/validation')
const { createId } = require('../utils/ids')
const { resolveMandirId, getMandirProfile } = require('../services/tenantService')

const router = express.Router()

function requireSuperAdmin(req) {
  if (req.user?.role !== 'super_admin') {
    throw forbidden('Only super admin can manage tenants.')
  }
}

router.get('/context', (req, res) => {
  const db = getDb()
  const mandirId = resolveMandirId(req, db)
  res.json({
    mandirId,
    mandirProfile: getMandirProfile(db, mandirId),
  })
})

router.get('/mandirs', (req, res) => {
  requireSuperAdmin(req)
  const db = getDb()
  res.json({
    mandirs: db.mandirs || [],
  })
})

router.post('/mandirs', async (req, res, next) => {
  try {
    requireSuperAdmin(req)
    const db = getDb()

    const name = ensureRequiredString(req.body?.name)
    const address = ensureRequiredString(req.body?.address)
    const pan = ensureRequiredString(req.body?.pan)
    const reg80G = ensureRequiredString(req.body?.reg80G)
    const trustNumber = ensureRequiredString(req.body?.trustNumber)
    const letterhead = ensureRequiredString(req.body?.letterhead)
    const timezone = ensureRequiredString(req.body?.timezone) || 'Asia/Kolkata'
    const requestedId = ensureRequiredString(req.body?.id)

    if (!name || !address || !pan || !reg80G || !trustNumber || !letterhead) {
      throw badRequest('name, address, pan, reg80G, trustNumber, and letterhead are required.')
    }

    const id = requestedId || createId('MDR')
    if ((db.mandirs || []).some((item) => item.id === id)) {
      throw badRequest(`Mandir with id ${id} already exists.`)
    }

    const mandir = {
      id,
      name,
      address,
      pan,
      reg80G,
      trustNumber,
      letterhead,
      timezone,
      isActive: true,
      createdAt: new Date().toISOString(),
    }
    db.mandirs.push(mandir)
    await saveDb()
    return res.status(201).json({ mandir })
  } catch (error) {
    return next(error)
  }
})

router.patch('/mandirs/:mandirId', async (req, res, next) => {
  try {
    requireSuperAdmin(req)
    const db = getDb()
    const mandir = (db.mandirs || []).find((item) => item.id === req.params.mandirId)
    if (!mandir) {
      throw notFound('Mandir not found.')
    }

    if (req.body?.name !== undefined) mandir.name = ensureRequiredString(req.body?.name)
    if (req.body?.address !== undefined) mandir.address = ensureRequiredString(req.body?.address)
    if (req.body?.pan !== undefined) mandir.pan = ensureRequiredString(req.body?.pan)
    if (req.body?.reg80G !== undefined) mandir.reg80G = ensureRequiredString(req.body?.reg80G)
    if (req.body?.trustNumber !== undefined) mandir.trustNumber = ensureRequiredString(req.body?.trustNumber)
    if (req.body?.letterhead !== undefined) mandir.letterhead = ensureRequiredString(req.body?.letterhead)
    if (req.body?.timezone !== undefined) mandir.timezone = ensureRequiredString(req.body?.timezone)
    if (req.body?.isActive !== undefined) mandir.isActive = Boolean(req.body?.isActive)
    mandir.updatedAt = new Date().toISOString()

    await saveDb()
    return res.json({ mandir })
  } catch (error) {
    return next(error)
  }
})

module.exports = { tenantRoutes: router }
