const { getDb, saveDb } = require('../store/db')
const { createId } = require('../utils/ids')
const { formatInr } = require('../utils/format')
const { toISODate } = require('../utils/date')
const { env } = require('../config/env')

const MAX_RETRY_ATTEMPTS = 3
const RETRY_BACKOFF_MINUTES = [15, 60, 180]

function normalizeBaseUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '')
}

function hasHttpProtocol(value) {
  return /^https?:\/\//i.test(String(value || '').trim())
}

function joinBaseAndPath(base, maybePath) {
  const safeBase = normalizeBaseUrl(base)
  const pathValue = String(maybePath || '').trim()
  if (!safeBase || !pathValue) return ''
  return `${safeBase}${pathValue.startsWith('/') ? '' : '/'}${pathValue}`
}

function resolveReceiptLink(transaction) {
  const receiptPath = String(transaction.receiptPath || '').trim()
  const verificationUrl = String(transaction.receiptVerificationUrl || '').trim()
  const publicBaseUrl = normalizeBaseUrl(env.receiptPublicBaseUrl)

  if (hasHttpProtocol(receiptPath)) return receiptPath
  if (publicBaseUrl && receiptPath) return joinBaseAndPath(publicBaseUrl, receiptPath)
  if (hasHttpProtocol(verificationUrl)) return verificationUrl
  if (publicBaseUrl && verificationUrl.startsWith('/')) return joinBaseAndPath(publicBaseUrl, verificationUrl)
  return receiptPath || verificationUrl
}

function buildInstantReceiptMessage(transaction, familyName) {
  const safeName = transaction.type === 'Gupt Daan' ? 'Devotee' : familyName || 'Devotee'
  const receiptLink = resolveReceiptLink(transaction)
  const linkLine = receiptLink
    ? `Download your official receipt here: ${receiptLink}.`
    : 'Your official receipt is ready in JMMS.'
  return `Jai Jinendra ${safeName}, we have received your ${transaction.type} of ${formatInr(
    transaction.amount,
  )} for ${transaction.fundCategory}. ${linkLine} Punyanumodana!`
}

function buildPledgeReminderMessage(transaction, familyName) {
  return `Jai Jinendra ${familyName || 'Devotee'}. A gentle reminder regarding your pledged Boli of ${formatInr(
    transaction.amount,
  )} for ${transaction.fundCategory}. Kindly coordinate with the Munim to complete the offering. Ignore if already paid.`
}

function createLog({
  templateType,
  trigger,
  familyName,
  phone,
  status,
  detail,
  transactionId,
  initiatedBy,
  attempt = 1,
  retryAt = '',
}) {
  return {
    id: createId('WLOG'),
    timestamp: new Date().toISOString(),
    templateType,
    trigger,
    transactionId,
    familyName,
    phone,
    status,
    detail,
    initiatedBy,
    attempt,
    retryAt,
  }
}

function removeRetryQueueItems(db, { queueId = '', transactionId = '', templateType = '' } = {}) {
  db.whatsAppRetryQueue = db.whatsAppRetryQueue.filter((item) => {
    if (queueId && item.id === queueId) return false
    if (transactionId && templateType && item.transactionId === transactionId && item.templateType === templateType) {
      return false
    }
    return true
  })
}

function scheduleRetry(db, { queueId = '', transaction, templateType, trigger, initiatedBy, attempt, error }) {
  const delayMinutes = RETRY_BACKOFF_MINUTES[Math.max(0, attempt - 1)] || RETRY_BACKOFF_MINUTES.at(-1) || 180
  const nextRetryAt = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString()

  const existing = db.whatsAppRetryQueue.find((item) => item.id === queueId)
  if (existing) {
    existing.attempt = attempt + 1
    existing.nextRetryAt = nextRetryAt
    existing.lastError = String(error)
    existing.trigger = trigger
    existing.initiatedBy = initiatedBy
    existing.updatedAt = new Date().toISOString()
    return { queueItem: existing, nextRetryAt }
  }

  const queueItem = {
    id: createId('WQ'),
    transactionId: transaction.id,
    templateType,
    trigger,
    initiatedBy,
    attempt: attempt + 1,
    nextRetryAt,
    lastError: String(error),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  db.whatsAppRetryQueue.unshift(queueItem)
  return { queueItem, nextRetryAt }
}

function isHttpUrl(value) {
  return hasHttpProtocol(value)
}

function resolveDispatchUrl(config) {
  const configuredUrl = String(config.apiUrl || '').trim()
  if (isHttpUrl(configuredUrl)) return configuredUrl

  if (config.provider === 'Meta WhatsApp Cloud API') {
    return `http://127.0.0.1:${env.port}/api/whatsapp/adapter/send`
  }
  return ''
}

async function sendWhatsAppTemplate({
  transaction,
  templateType,
  trigger,
  initiatedBy = 'system',
  attempt = 1,
  queueId = '',
  queueOnFailure = true,
}) {
  const db = getDb()
  const family = db.families.find((item) => item.familyId === transaction.familyId)
  const familyName = family?.headName || 'Anonymous'
  const phone = family?.whatsapp || ''
  const config = db.whatsappConfig
  const message =
    templateType === 'instant_receipt'
      ? buildInstantReceiptMessage(transaction, familyName)
      : buildPledgeReminderMessage(transaction, familyName)
  const metaTemplateName =
    templateType === 'instant_receipt' ? env.whatsappTemplateInstantReceipt : env.whatsappTemplatePledgeReminder
  const shouldUseMetaTemplate =
    config.provider === 'Meta WhatsApp Cloud API' &&
    env.whatsappUseTemplateForReceipts &&
    String(metaTemplateName || '').trim().length > 0

  if (!phone) {
    const skipped = createLog({
      templateType,
      trigger,
      transactionId: transaction.id,
      familyName,
      phone: '-',
      status: 'Skipped',
      detail: 'No WhatsApp number available for this family.',
      initiatedBy,
      attempt,
    })
    db.whatsappLogs.unshift(skipped)
    removeRetryQueueItems(db, {
      queueId,
      transactionId: transaction.id,
      templateType,
    })
    await saveDb()
    return skipped
  }

  const dispatchUrl = resolveDispatchUrl(config)
  if (config.provider === 'Mock Gateway' || (!dispatchUrl && config.provider !== 'Meta WhatsApp Cloud API')) {
    const mockLog = createLog({
      templateType,
      trigger,
      transactionId: transaction.id,
      familyName,
      phone,
      status: 'Mock Sent',
      detail: message,
      initiatedBy,
      attempt,
    })
    db.whatsappLogs.unshift(mockLog)
    removeRetryQueueItems(db, {
      queueId,
      transactionId: transaction.id,
      templateType,
    })
    await saveDb()
    return mockLog
  }

  try {
    const configToken = String(config.accessToken || '').trim()
    const envToken = String(env.whatsappAccessToken || '').trim()
    const tokenCandidates =
      config.provider === 'Meta WhatsApp Cloud API'
        ? [configToken, ...(envToken && envToken !== configToken ? [envToken] : [])]
        : [configToken]
    const uniqueTokens = []
    for (const candidate of tokenCandidates) {
      if (!uniqueTokens.includes(candidate)) {
        uniqueTokens.push(candidate)
      }
    }
    if (!uniqueTokens.length) {
      uniqueTokens.push('')
    }

    let sent = false
    let dispatchError = ''
    let dispatchPayload = null
    for (const outboundToken of uniqueTokens) {
      try {
        const response = await fetch(dispatchUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${outboundToken}`,
          },
          body: JSON.stringify({
            provider: config.provider,
            to: phone,
            templateType,
            message,
            businessNumber: config.businessNumber || '',
            meta: {
              transactionId: transaction.id,
              trigger,
              useTemplate: shouldUseMetaTemplate,
              templateName: String(metaTemplateName || '').trim(),
              templateLanguage: String(env.whatsappTemplateLanguage || 'en_US').trim(),
              templateBodyText: env.whatsappTemplatePassFullMessageAsBodyParam ? message : '',
              sendFollowupText: shouldUseMetaTemplate && env.whatsappTemplateSendFollowupText,
              followupText: message,
            },
          }),
        })

        const raw = await response.text().catch(() => '')
        let parsed = raw
        try {
          parsed = raw ? JSON.parse(raw) : {}
        } catch (_error) {}

        if (response.ok) {
          sent = true
          dispatchPayload = parsed
          break
        }

        dispatchError = raw ? `HTTP ${response.status} ${raw}` : `HTTP ${response.status}`
      } catch (requestError) {
        dispatchError = String(requestError)
      }
    }

    if (!sent) {
      throw new Error(dispatchError || 'WhatsApp dispatch failed.')
    }

    let sentStatus = 'Sent'
    let sentDetail = message
    if (dispatchPayload?.mode) {
      const followupMeta =
        dispatchPayload?.mode === 'template_then_text'
          ? `, followupSent=${dispatchPayload?.followupSent === true ? 'true' : 'false'}`
          : ''
      sentDetail = `${message} | dispatchMode=${dispatchPayload.mode}${followupMeta}`
    }
    if (dispatchPayload?.mode === 'template_then_text' && dispatchPayload?.followupSent === false) {
      const followupError =
        typeof dispatchPayload?.followupResult === 'string'
          ? dispatchPayload.followupResult
          : JSON.stringify(dispatchPayload?.followupResult || {})
      sentStatus = 'Template Sent / Text Failed'
      sentDetail = `${message} | Follow-up text failed (${dispatchPayload?.followupStatus || '-'}) ${followupError}`
    }

    const sentLog = createLog({
      templateType,
      trigger,
      transactionId: transaction.id,
      familyName,
      phone,
      status: sentStatus,
      detail: sentDetail,
      initiatedBy,
      attempt,
    })
    db.whatsappLogs.unshift(sentLog)
    removeRetryQueueItems(db, {
      queueId,
      transactionId: transaction.id,
      templateType,
    })
    await saveDb()
    return sentLog
  } catch (error) {
    let status = 'Failed'
    let retryAt = ''
    if (queueOnFailure && attempt < MAX_RETRY_ATTEMPTS) {
      status = 'Retry Scheduled'
      const scheduled = scheduleRetry(db, {
        queueId,
        transaction,
        templateType,
        trigger,
        initiatedBy,
        attempt,
        error,
      })
      retryAt = scheduled.nextRetryAt
    } else {
      removeRetryQueueItems(db, { queueId })
    }

    const failedLog = createLog({
      templateType,
      trigger,
      transactionId: transaction.id,
      familyName,
      phone,
      status,
      detail: String(error),
      initiatedBy,
      attempt,
      retryAt,
    })
    db.whatsappLogs.unshift(failedLog)
    await saveDb()
    return failedLog
  }
}

async function runDueDateReminderSweep({ trigger, initiatedBy = 'system' }) {
  const db = getDb()
  const today = toISODate(new Date(), env.timezone)
  const dueTransactions = db.transactions.filter(
    (transaction) =>
      transaction.status === 'Pledged' &&
      !transaction.cancelled &&
      transaction.dueDate &&
      transaction.dueDate <= today,
  )

  if (!dueTransactions.length) {
    const noRowsLog = createLog({
      templateType: 'pledge_due_reminder',
      trigger,
      transactionId: '-',
      familyName: '-',
      phone: '-',
      status: 'No Rows',
      detail: 'No pledged records due today or overdue.',
      initiatedBy,
    })
    db.whatsappLogs.unshift(noRowsLog)
    db.jobs.dueReminderLastRunDate = today
    await saveDb()
    return { reminderCount: 0 }
  }

  for (const transaction of dueTransactions) {
    await sendWhatsAppTemplate({
      transaction,
      templateType: 'pledge_due_reminder',
      trigger,
      initiatedBy,
    })
  }

  db.jobs.dueReminderLastRunDate = today
  await saveDb()
  return { reminderCount: dueTransactions.length }
}

async function runWhatsAppRetrySweep({ trigger, initiatedBy = 'system' }) {
  const db = getDb()
  const now = new Date()
  const dueEntries = db.whatsAppRetryQueue.filter((item) => {
    const retryAt = Date.parse(item.nextRetryAt || '')
    return Number.isFinite(retryAt) && retryAt <= now.getTime()
  })

  if (!dueEntries.length) {
    db.jobs.whatsAppRetryLastRunAt = now.toISOString()
    await saveDb()
    return { retriedCount: 0 }
  }

  let retriedCount = 0
  for (const item of dueEntries) {
    const transaction = db.transactions.find((tx) => tx.id === item.transactionId)
    if (!transaction) {
      removeRetryQueueItems(db, { queueId: item.id })
      continue
    }

    await sendWhatsAppTemplate({
      transaction,
      templateType: item.templateType,
      trigger: trigger || item.trigger || 'retry_sweep',
      initiatedBy,
      attempt: Number(item.attempt) || 1,
      queueId: item.id,
      queueOnFailure: true,
    })
    retriedCount += 1
  }

  db.jobs.whatsAppRetryLastRunAt = now.toISOString()
  await saveDb()
  return { retriedCount }
}

module.exports = {
  sendWhatsAppTemplate,
  runDueDateReminderSweep,
  runWhatsAppRetrySweep,
  buildInstantReceiptMessage,
  buildPledgeReminderMessage,
}
