const express = require('express')
const { authorize } = require('../middleware/authorize')
const { getDb, saveDb } = require('../store/db')
const { badRequest, notFound } = require('../utils/http')
const { createId } = require('../utils/ids')
const { ensurePositiveInteger, ensureRequiredString } = require('../utils/validation')
const { toISODate } = require('../utils/date')
const { env } = require('../config/env')
const { resolveMandirId, filterByMandir, withMandir, getRecordMandirId } = require('../services/tenantService')

const router = express.Router()

router.get('/assets', authorize('viewInventory'), (req, res) => {
  const db = getDb()
  const mandirId = resolveMandirId(req, db)
  res.json({ assets: filterByMandir(db.assets, mandirId), mandirId })
})

router.post('/assets', authorize('manageInventory'), async (req, res, next) => {
  try {
    const db = getDb()
    const mandirId = resolveMandirId(req, db)
    const name = ensureRequiredString(req.body?.name)
    const totalUnits = ensurePositiveInteger(req.body?.totalUnits)
    if (!name || !totalUnits) {
      throw badRequest('Asset name and positive integer total units are required.')
    }

    const asset = withMandir({
      id: createId('AST'),
      name,
      totalUnits,
      availableUnits: totalUnits,
    }, mandirId)

    db.assets.push(asset)
    await saveDb()

    return res.status(201).json({ asset })
  } catch (error) {
    return next(error)
  }
})

router.get('/assets/checkouts', authorize('viewInventory'), (req, res) => {
  const db = getDb()
  const mandirId = resolveMandirId(req, db)
  const today = toISODate(new Date(), env.timezone)
  const checkouts = filterByMandir(db.assetCheckouts, mandirId).map((checkout) => ({
    ...checkout,
    isOverdue: checkout.status === 'Checked Out' && checkout.expectedReturnDate < today,
  }))
  res.json({ checkouts, mandirId })
})

router.post('/assets/checkouts', authorize('manageInventory'), async (req, res, next) => {
  try {
    const db = getDb()
    const mandirId = resolveMandirId(req, db)
    const assetId = ensureRequiredString(req.body?.assetId)
    const familyId = ensureRequiredString(req.body?.familyId)
    const quantity = ensurePositiveInteger(req.body?.quantity)
    const expectedReturnDate = ensureRequiredString(req.body?.expectedReturnDate)

    if (!assetId || !familyId || !quantity || !expectedReturnDate) {
      throw badRequest('assetId, familyId, quantity, and expectedReturnDate are required.')
    }

    const asset = db.assets.find((item) => item.id === assetId && getRecordMandirId(item) === mandirId)
    if (!asset) throw notFound('Asset not found.')
    if (!db.families.some((item) => item.familyId === familyId && getRecordMandirId(item) === mandirId)) {
      throw badRequest('Family not found.')
    }
    if (quantity > asset.availableUnits) {
      throw badRequest('Requested checkout quantity exceeds available units.')
    }

    asset.availableUnits -= quantity
    const checkout = withMandir({
      id: createId('CHK'),
      assetId,
      familyId,
      quantity,
      expectedReturnDate,
      checkedOutAt: new Date().toISOString(),
      returnedAt: '',
      status: 'Checked Out',
    }, mandirId)

    db.assetCheckouts.unshift(checkout)
    await saveDb()
    return res.status(201).json({ checkout })
  } catch (error) {
    return next(error)
  }
})

router.post('/assets/checkouts/:checkoutId/return', authorize('manageInventory'), async (req, res, next) => {
  try {
    const db = getDb()
    const mandirId = resolveMandirId(req, db)
    const checkout = db.assetCheckouts.find(
      (item) => item.id === req.params.checkoutId && getRecordMandirId(item) === mandirId,
    )
    if (!checkout) throw notFound('Checkout record not found.')
    if (checkout.status !== 'Checked Out') {
      throw badRequest('Checkout already marked as returned.')
    }

    const asset = db.assets.find(
      (item) => item.id === checkout.assetId && getRecordMandirId(item) === mandirId,
    )
    if (!asset) throw notFound('Asset linked to checkout not found.')

    checkout.status = 'Returned'
    checkout.returnedAt = new Date().toISOString()
    asset.availableUnits = Math.min(asset.totalUnits, asset.availableUnits + checkout.quantity)

    await saveDb()
    return res.json({ checkout })
  } catch (error) {
    return next(error)
  }
})

module.exports = { inventoryRoutes: router }
