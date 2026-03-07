const cron = require('node-cron')
const { env } = require('../config/env')
const { runDueDateReminderSweep, runWhatsAppRetrySweep } = require('./whatsappService')

function startDueReminderCron() {
  const task = cron.schedule(
    '0 10 * * *',
    async () => {
      try {
        await runDueDateReminderSweep({
          trigger: 'daily_10am_cron',
          initiatedBy: 'system',
        })
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Due reminder cron failure:', error)
      }
    },
    { timezone: env.timezone },
  )

  return task
}

function startWhatsAppRetryCron() {
  const task = cron.schedule(
    '*/15 * * * *',
    async () => {
      try {
        await runWhatsAppRetrySweep({
          trigger: 'retry_15min_cron',
          initiatedBy: 'system',
        })
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('WhatsApp retry cron failure:', error)
      }
    },
    { timezone: env.timezone },
  )

  return task
}

module.exports = { startDueReminderCron, startWhatsAppRetryCron }
