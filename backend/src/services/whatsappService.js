const fs = require('node:fs')
const path = require('node:path')
const dotenv = require('dotenv')
const { getDb, saveDb } = require('../store/db')
const { createId } = require('../utils/ids')
const { formatInr } = require('../utils/format')
const { toISODate } = require('../utils/date')
const { isPlaceholderMetaTemplateName } = require('../utils/whatsappTemplates')
const { env } = require('../config/env')
const { getRecordMandirId, DEFAULT_MANDIR_ID } = require('./tenantService')

const MAX_RETRY_ATTEMPTS = 3
const RETRY_BACKOFF_MINUTES = [15, 60, 180]
const DEFAULT_RUNTIME_ENV_PATH = path.resolve(__dirname, '../../.env')

function normalizeBaseUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '')
}

function hasHttpProtocol(value) {
  return /^https?:\/\//i.test(String(value || '').trim())
}

function normalizePhone(value) {
  return String(value || '').replace(/[^\d]/g, '')
}

function joinBaseAndPath(base, maybePath) {
  const safeBase = normalizeBaseUrl(base)
  const pathValue = String(maybePath || '').trim()
  if (!safeBase || !pathValue) return ''
  return `${safeBase}${pathValue.startsWith('/') ? '' : '/'}${pathValue}`
}

function getRuntimeEnvPath() {
  const overridePath = String(process.env.PUNYANIDHI_RUNTIME_ENV_PATH || '').trim()
  return overridePath ? path.resolve(overridePath) : DEFAULT_RUNTIME_ENV_PATH
}

function readRuntimeEnvFile() {
  try {
    const runtimeEnvPath = getRuntimeEnvPath()
    if (!fs.existsSync(runtimeEnvPath)) return {}
    return dotenv.parse(fs.readFileSync(runtimeEnvPath, 'utf8'))
  } catch (_error) {
    return {}
  }
}

function hasOwn(source, key) {
  return Object.prototype.hasOwnProperty.call(source || {}, key)
}

function resolveRuntimeString(fileEnv, key, fallback = '') {
  if (hasOwn(fileEnv, key)) {
    return String(fileEnv[key] || '')
  }
  return String(fallback || '')
}

function resolveRuntimeBoolean(fileEnv, key, fallback = false) {
  if (hasOwn(fileEnv, key)) {
    return String(fileEnv[key] || '').trim().toLowerCase() === 'true'
  }
  return Boolean(fallback)
}

function getRuntimeMessagingConfig() {
  const fileEnv = readRuntimeEnvFile()
  return {
    receiptPublicBaseUrl: resolveRuntimeString(fileEnv, 'RECEIPT_PUBLIC_BASE_URL', env.receiptPublicBaseUrl),
    whatsappAccessToken: resolveRuntimeString(fileEnv, 'WHATSAPP_ACCESS_TOKEN', env.whatsappAccessToken),
    whatsappUseTemplateForReceipts: resolveRuntimeBoolean(
      fileEnv,
      'WHATSAPP_USE_TEMPLATE_FOR_RECEIPTS',
      env.whatsappUseTemplateForReceipts,
    ),
    whatsappTemplateInstantReceipt: resolveRuntimeString(
      fileEnv,
      'WHATSAPP_TEMPLATE_INSTANT_RECEIPT',
      env.whatsappTemplateInstantReceipt,
    ),
    whatsappTemplatePledgeReminder: resolveRuntimeString(
      fileEnv,
      'WHATSAPP_TEMPLATE_PLEDGE_REMINDER',
      env.whatsappTemplatePledgeReminder,
    ),
    whatsappTemplateLanguage: resolveRuntimeString(
      fileEnv,
      'WHATSAPP_TEMPLATE_LANGUAGE',
      env.whatsappTemplateLanguage,
    ),
    whatsappTemplatePassFullMessageAsBodyParam: resolveRuntimeBoolean(
      fileEnv,
      'WHATSAPP_TEMPLATE_PASS_FULL_MESSAGE_AS_BODY_PARAM',
      env.whatsappTemplatePassFullMessageAsBodyParam,
    ),
    whatsappTemplateSendFollowupText: resolveRuntimeBoolean(
      fileEnv,
      'WHATSAPP_TEMPLATE_SEND_FOLLOWUP_TEXT',
      env.whatsappTemplateSendFollowupText,
    ),
    whatsappAllowSampleTemplate: resolveRuntimeBoolean(
      fileEnv,
      'WHATSAPP_ALLOW_SAMPLE_TEMPLATE',
      env.whatsappAllowSampleTemplate,
    ),
  }
}

function resolveReceiptLink(transaction, runtimeConfig = getRuntimeMessagingConfig()) {
  const receiptPath = String(transaction.receiptPath || '').trim()
  const verificationUrl = String(transaction.receiptVerificationUrl || '').trim()
  const publicBaseUrl = normalizeBaseUrl(runtimeConfig.receiptPublicBaseUrl)

  if (hasHttpProtocol(receiptPath)) return receiptPath
  if (publicBaseUrl && receiptPath) return joinBaseAndPath(publicBaseUrl, receiptPath)
  if (hasHttpProtocol(verificationUrl)) return verificationUrl
  if (publicBaseUrl && verificationUrl.startsWith('/')) return joinBaseAndPath(publicBaseUrl, verificationUrl)
  return receiptPath || verificationUrl
}

function resolveReceiptDocumentLink(transaction, runtimeConfig = getRuntimeMessagingConfig()) {
  const receiptPath = String(transaction.receiptPath || '').trim()
  const publicBaseUrl = normalizeBaseUrl(runtimeConfig.receiptPublicBaseUrl)

  if (hasHttpProtocol(receiptPath)) return receiptPath
  if (publicBaseUrl && receiptPath) return joinBaseAndPath(publicBaseUrl, receiptPath)
  return ''
}

function buildInstantReceiptMessage(transaction, familyName, runtimeConfig = getRuntimeMessagingConfig()) {
  const safeName = transaction.type === 'Gupt Daan' ? 'Devotee' : familyName || 'Devotee'
  const receiptLink = resolveReceiptLink(transaction, runtimeConfig)
  const linkLine = receiptLink
    ? `Download your official receipt here: ${receiptLink}.`
    : 'Your official receipt is ready in Punyanidhi.'
  return `Jai Jinendra ${safeName}, we have received your ${transaction.type} of ${formatInr(
    transaction.amount,
  )} for ${transaction.fundCategory}. ${linkLine} Punyanumodana!`
}

function buildInstantReceiptTemplateBodyParams(transaction, familyName) {
  const safeName = transaction.type === 'Gupt Daan' ? 'Devotee' : familyName || 'Devotee'
  const formattedAmount = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(transaction.amount) || 0)

  return [safeName, formattedAmount]
}

function buildInstantReceiptTemplateButtonUrlParams(transaction) {
  const receiptFileName = String(transaction.receiptFileName || `${transaction.id}.pdf`).trim()
  return receiptFileName ? [receiptFileName] : []
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
  mandirId = DEFAULT_MANDIR_ID,
  providerMessageId = '',
  providerWaId = '',
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
    mandirId,
    providerMessageId,
    providerWaId,
  }
}

function removeRetryQueueItems(db, { queueId = '', transactionId = '', templateType = '', mandirId = '' } = {}) {
  db.whatsAppRetryQueue = db.whatsAppRetryQueue.filter((item) => {
    if (queueId && item.id === queueId) return false
    if (
      transactionId &&
      templateType &&
      item.transactionId === transactionId &&
      item.templateType === templateType &&
      (!mandirId || item.mandirId === mandirId)
    ) {
      return false
    }
    return true
  })
}

function scheduleRetry(db, { queueId = '', transaction, templateType, trigger, initiatedBy, attempt, error, mandirId }) {
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
    mandirId,
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
  mandirId = '',
}) {
  const db = getDb()
  const transactionMandirId = mandirId || getRecordMandirId(transaction)
  const family = db.families.find(
    (item) => item.familyId === transaction.familyId && getRecordMandirId(item) === transactionMandirId,
  )
  const familyName = family?.headName || 'Anonymous'
  const phone = family?.whatsapp || ''
  const config = db.whatsappConfig
  const businessNumber = String(config.businessNumber || '').trim()
  const runtimeConfig = getRuntimeMessagingConfig()
  const message =
    templateType === 'instant_receipt'
      ? buildInstantReceiptMessage(transaction, familyName, runtimeConfig)
      : buildPledgeReminderMessage(transaction, familyName)
  const receiptDocumentUrl =
    templateType === 'instant_receipt' ? resolveReceiptDocumentLink(transaction, runtimeConfig) : ''
  const receiptDocumentFilename =
    templateType === 'instant_receipt'
      ? String(transaction.receiptFileName || `${transaction.id}.pdf`).trim()
      : ''
  const templateBodyParams =
    templateType === 'instant_receipt' ? buildInstantReceiptTemplateBodyParams(transaction, familyName) : []
  const templateButtonUrlParams =
    templateType === 'instant_receipt' ? buildInstantReceiptTemplateButtonUrlParams(transaction) : []
  const metaTemplateName =
    templateType === 'instant_receipt'
      ? runtimeConfig.whatsappTemplateInstantReceipt
      : runtimeConfig.whatsappTemplatePledgeReminder
  const normalizedMetaTemplateName = String(metaTemplateName || '').trim()
  const metaTemplateModeEnabled =
    config.provider === 'Meta WhatsApp Cloud API' && runtimeConfig.whatsappUseTemplateForReceipts
  const metaTemplateMissing = metaTemplateModeEnabled && !normalizedMetaTemplateName
  const metaTemplatePlaceholder =
    metaTemplateModeEnabled &&
    isPlaceholderMetaTemplateName(normalizedMetaTemplateName) &&
    !runtimeConfig.whatsappAllowSampleTemplate
  const shouldUseMetaTemplate =
    metaTemplateModeEnabled && normalizedMetaTemplateName.length > 0 && !metaTemplatePlaceholder

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
      mandirId: transactionMandirId,
    })
    db.whatsappLogs.unshift(skipped)
    removeRetryQueueItems(db, {
      queueId,
      transactionId: transaction.id,
      templateType,
      mandirId: transactionMandirId,
    })
    await saveDb()
    return skipped
  }

  if (businessNumber && normalizePhone(phone) === normalizePhone(businessNumber)) {
    const skipped = createLog({
      templateType,
      trigger,
      transactionId: transaction.id,
      familyName,
      phone,
      status: 'Skipped',
      detail: 'Recipient WhatsApp number matches the configured business sender number. Use a different devotee number.',
      initiatedBy,
      attempt,
      mandirId: transactionMandirId,
    })
    db.whatsappLogs.unshift(skipped)
    removeRetryQueueItems(db, {
      queueId,
      transactionId: transaction.id,
      templateType,
      mandirId: transactionMandirId,
    })
    await saveDb()
    return skipped
  }

  if (metaTemplateMissing || metaTemplatePlaceholder) {
    const configIssue = metaTemplateMissing
      ? 'Meta template mode is enabled, but no approved template name is configured.'
      : `Configured template "${normalizedMetaTemplateName}" is Meta's sample placeholder and cannot be used for live receipts.`
    const skippedLog = createLog({
      templateType,
      trigger,
      transactionId: transaction.id,
      familyName,
      phone,
      status: 'Skipped',
      detail: `${configIssue} Update the WhatsApp template settings before sending receipt notifications.`,
      initiatedBy,
      attempt,
      mandirId: transactionMandirId,
    })
    db.whatsappLogs.unshift(skippedLog)
    removeRetryQueueItems(db, {
      queueId,
      transactionId: transaction.id,
      templateType,
      mandirId: transactionMandirId,
    })
    await saveDb()
    return skippedLog
  }

  const dispatchUrl = resolveDispatchUrl(config)
  if (!dispatchUrl && config.provider !== 'Meta WhatsApp Cloud API') {
    const skippedLog = createLog({
      templateType,
      trigger,
      transactionId: transaction.id,
      familyName,
      phone,
      status: 'Skipped',
      detail: `Provider ${config.provider || '-'} is not configured with a dispatch URL.`,
      initiatedBy,
      attempt,
      mandirId: transactionMandirId,
    })
    db.whatsappLogs.unshift(skippedLog)
    removeRetryQueueItems(db, {
      queueId,
      transactionId: transaction.id,
      templateType,
      mandirId: transactionMandirId,
    })
    await saveDb()
    return skippedLog
  }

  try {
    const configToken = String(config.accessToken || '').trim()
    const envToken = String(runtimeConfig.whatsappAccessToken || '').trim()
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
              templateLanguage: String(runtimeConfig.whatsappTemplateLanguage || 'en_US').trim(),
              templateBodyText: runtimeConfig.whatsappTemplatePassFullMessageAsBodyParam ? message : '',
              templateBodyParams,
              templateButtonUrlParams,
              templateButtonUrlIndex: '0',
              sendFollowupText: shouldUseMetaTemplate && runtimeConfig.whatsappTemplateSendFollowupText,
              followupText: message,
              followupDocumentUrl: receiptDocumentUrl,
              followupDocumentFilename: receiptDocumentFilename,
              followupDocumentCaption: message,
              allowSampleTemplate: runtimeConfig.whatsappAllowSampleTemplate,
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
    const providerMessageId = String(dispatchPayload?.result?.messages?.[0]?.id || '').trim()
    const providerWaId = String(dispatchPayload?.result?.contacts?.[0]?.wa_id || '').trim()
    if (dispatchPayload?.mode) {
      const followupMeta =
        String(dispatchPayload.mode).startsWith('template_then_')
          ? `, followupSent=${dispatchPayload?.followupSent === true ? 'true' : 'false'}`
          : ''
      sentDetail = `${message} | dispatchMode=${dispatchPayload.mode}${followupMeta}`
    }
    if (providerMessageId) {
      sentDetail = `${sentDetail} | messageId=${providerMessageId}`
    }
    if (providerWaId) {
      sentDetail = `${sentDetail} | waId=${providerWaId}`
    }
    if (String(dispatchPayload?.mode || '').startsWith('template_then_') && dispatchPayload?.followupSent === false) {
      const followupError =
        typeof dispatchPayload?.followupResult === 'string'
          ? dispatchPayload.followupResult
          : JSON.stringify(dispatchPayload?.followupResult || {})
      sentStatus = 'Template Sent / Follow-up Failed'
      sentDetail = `${message} | Follow-up failed (${dispatchPayload?.followupStatus || '-'}) ${followupError}`
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
      mandirId: transactionMandirId,
      providerMessageId,
      providerWaId,
    })
    db.whatsappLogs.unshift(sentLog)
    removeRetryQueueItems(db, {
      queueId,
      transactionId: transaction.id,
      templateType,
      mandirId: transactionMandirId,
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
        mandirId: transactionMandirId,
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
      mandirId: transactionMandirId,
    })
    db.whatsappLogs.unshift(failedLog)
    await saveDb()
    return failedLog
  }
}

async function runDueDateReminderSweep({ trigger, initiatedBy = 'system', mandirId = '' }) {
  const db = getDb()
  const targetMandirId = mandirId || ''
  const today = toISODate(new Date(), env.timezone)
  const dueTransactions = db.transactions.filter(
    (transaction) =>
      (!targetMandirId || getRecordMandirId(transaction) === targetMandirId) &&
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
      mandirId: targetMandirId || DEFAULT_MANDIR_ID,
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
      mandirId: targetMandirId,
    })
  }

  db.jobs.dueReminderLastRunDate = today
  await saveDb()
  return { reminderCount: dueTransactions.length }
}

async function runWhatsAppRetrySweep({ trigger, initiatedBy = 'system', mandirId = '' }) {
  const db = getDb()
  const now = new Date()
  const dueEntries = db.whatsAppRetryQueue.filter((item) => {
    const retryAt = Date.parse(item.nextRetryAt || '')
    return Number.isFinite(retryAt) && retryAt <= now.getTime() && (!mandirId || item.mandirId === mandirId)
  })

  if (!dueEntries.length) {
    db.jobs.whatsAppRetryLastRunAt = now.toISOString()
    await saveDb()
    return { retriedCount: 0 }
  }

  let retriedCount = 0
  for (const item of dueEntries) {
    const transaction = db.transactions.find(
      (tx) => tx.id === item.transactionId && (!mandirId || getRecordMandirId(tx) === mandirId),
    )
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
      mandirId: item.mandirId || mandirId,
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
