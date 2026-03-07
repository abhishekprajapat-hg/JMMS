const express = require('express')
const { authorize } = require('../middleware/authorize')
const { getDb } = require('../store/db')
const {
  buildLedgerEntries,
  buildTrialBalance,
  buildFundBalance,
} = require('../services/accountingService')
const { ensureRequiredString } = require('../utils/validation')

const router = express.Router()

function getRange(req) {
  return {
    fromDate: ensureRequiredString(req.query?.fromDate),
    toDate: ensureRequiredString(req.query?.toDate),
  }
}

router.get('/ledger', authorize('viewAccounting'), (req, res) => {
  const db = getDb()
  const range = getRange(req)
  const entries = buildLedgerEntries(db, range)

  res.json({
    entries,
    totals: {
      debit: entries.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0),
      credit: entries.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0),
    },
  })
})

router.get('/trial-balance', authorize('viewAccounting'), (req, res) => {
  const db = getDb()
  const range = getRange(req)
  const entries = buildLedgerEntries(db, range)
  const trial = buildTrialBalance(entries)
  res.json(trial)
})

router.get('/fund-balance', authorize('viewAccounting'), (req, res) => {
  const db = getDb()
  const range = getRange(req)
  const output = buildFundBalance(db, range)
  res.json(output)
})

module.exports = { accountingRoutes: router }
