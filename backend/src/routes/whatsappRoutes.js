const express = require('express')
const { authorize } = require('../middleware/authorize')
const { getDb, saveDb } = require('../store/db')
const { WHATSAPP_PROVIDERS } = require('../constants/domain')
const { badRequest } = require('../utils/http')
const { ensureRequiredString } = require('../utils/validation')
const { runDueDateReminderSweep, runWhatsAppRetrySweep } = require('../services/whatsappService')
const { resolveMandirId, filterByMandir } = require('../services/tenantService')

const router = express.Router()

router.get('/config', authorize('manageWhatsApp'), (req, res) => {
  const db = getDb()
  const mandirId = resolveMandirId(req, db)
  res.json({
    whatsappConfig: db.whatsappConfig,
    providers: WHATSAPP_PROVIDERS,
    mandirId,
  })
})

router.put('/config', authorize('manageWhatsApp'), async (req, res, next) => {
  try {
    const db = getDb()
    const mandirId = resolveMandirId(req, db)
    const provider = ensureRequiredString(req.body?.provider)
    const apiUrl = ensureRequiredString(req.body?.apiUrl)
    const accessToken = ensureRequiredString(req.body?.accessToken)
    const businessNumber = ensureRequiredString(req.body?.businessNumber)

    if (!provider || !WHATSAPP_PROVIDERS.includes(provider)) {
      throw badRequest('Provider must be one of the supported WhatsApp providers.')
    }

    db.whatsappConfig = {
      provider,
      apiUrl,
      accessToken,
      businessNumber,
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.username,
      mandirId,
    }

    await saveDb()
    return res.json({ whatsappConfig: db.whatsappConfig })
  } catch (error) {
    return next(error)
  }
})

router.get('/logs', authorize('manageWhatsApp'), (req, res) => {
  const db = getDb()
  const mandirId = resolveMandirId(req, db)
  res.json({
    dueReminderLastRunDate: db.jobs?.dueReminderLastRunDate || '',
    whatsAppRetryLastRunAt: db.jobs?.whatsAppRetryLastRunAt || '',
    retryQueue: filterByMandir(db.whatsAppRetryQueue, mandirId) || [],
    logs: filterByMandir(db.whatsappLogs, mandirId),
    mandirId,
  })
})

router.post('/run-due-sweep', authorize('runCron'), async (req, res, next) => {
  try {
    const db = getDb()
    const mandirId = resolveMandirId(req, db)
    const result = await runDueDateReminderSweep({
      trigger: 'manual_due_sweep',
      initiatedBy: req.user.username,
      mandirId,
    })
    return res.json(result)
  } catch (error) {
    return next(error)
  }
})

router.post('/run-retry-sweep', authorize('runCron'), async (req, res, next) => {
  try {
    const db = getDb()
    const mandirId = resolveMandirId(req, db)
    const result = await runWhatsAppRetrySweep({
      trigger: 'manual_retry_sweep',
      initiatedBy: req.user.username,
      mandirId,
    })
    return res.json(result)
  } catch (error) {
    return next(error)
  }
})

module.exports = { whatsappRoutes: router }
