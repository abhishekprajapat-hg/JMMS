const express = require('express')
const { getDb } = require('../store/db')
const { env } = require('../config/env')
const { getPermissionsForRole } = require('../constants/rbac')
const {
  computeDashboardMetrics,
  buildLedgerByFund,
  buildMonthlyTrend,
  buildPledgeAging,
  buildTopContributors,
} = require('../services/metricsService')
const { authorize } = require('../middleware/authorize')
const { resolveMandirId, scopeDbByMandir } = require('../services/tenantService')

const router = express.Router()

router.get('/metrics', (req, res) => {
  const db = getDb()
  const mandirId = resolveMandirId(req, db)
  const scopedDb = scopeDbByMandir(db, mandirId)
  const permissions = getPermissionsForRole(req.user.role)
  const metrics = computeDashboardMetrics({ db: scopedDb, timezone: env.timezone })

  res.json({
    role: req.user.role,
    metrics: {
      ...metrics,
      todayPaidTotal: permissions.viewFinancialTotals ? metrics.todayPaidTotal : null,
    },
  })
})

router.get('/reports/summary', authorize('viewReports'), (req, res) => {
  const db = getDb()
  const mandirId = resolveMandirId(req, db)
  const scopedDb = scopeDbByMandir(db, mandirId)
  const activeTransactions = scopedDb.transactions.filter((transaction) => !transaction.cancelled)
  const paidTransactions = activeTransactions.filter((transaction) => transaction.status === 'Paid')
  const pledgedTransactions = activeTransactions.filter((transaction) => transaction.status === 'Pledged')

  res.json({
    reportDate: new Date().toISOString(),
    totals: {
      paidAmount: paidTransactions.reduce((sum, transaction) => sum + transaction.amount, 0),
      pledgedAmount: pledgedTransactions.reduce((sum, transaction) => sum + transaction.amount, 0),
      paidCount: paidTransactions.length,
      pledgedCount: pledgedTransactions.length,
      cancellationCount: scopedDb.cancellationLogs.length,
    },
    byFundCategory: buildLedgerByFund(activeTransactions),
  })
})

router.get('/reports/analytics', authorize('viewReports'), (req, res) => {
  const db = getDb()
  const mandirId = resolveMandirId(req, db)
  const scopedDb = scopeDbByMandir(db, mandirId)
  const activeTransactions = scopedDb.transactions.filter((transaction) => !transaction.cancelled)

  const ledgerByFund = buildLedgerByFund(activeTransactions)
  const byFundCategory = Object.entries(ledgerByFund).map(([fund, amount]) => ({ fund, amount }))

  res.json({
    reportDate: new Date().toISOString(),
    byFundCategory,
    monthlyTrend: buildMonthlyTrend({
      transactions: activeTransactions,
      timezone: env.timezone,
      months: 6,
    }),
    pledgeAging: buildPledgeAging({
      transactions: activeTransactions,
      timezone: env.timezone,
    }),
    topContributors: buildTopContributors({
      transactions: activeTransactions,
      families: scopedDb.families,
      limit: 10,
    }),
  })
})

module.exports = { dashboardRoutes: router }
