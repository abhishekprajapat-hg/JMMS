const express = require('express')
const { env } = require('../config/env')
const { getDb, saveDb } = require('../store/db')
const { createId } = require('../utils/ids')

const router = express.Router()

function normalizeWebhookPhone(value) {
  const raw = String(value || '').trim()
  if (!raw) return '-'
  if (raw.startsWith('+')) return raw
  const digits = raw.replace(/[^\d]/g, '')
  return digits ? `+${digits}` : raw
}

function formatMetaError(error) {
  if (!error || typeof error !== 'object') return ''
  const parts = []
  if (error.code) parts.push(`code=${error.code}`)
  if (error.title) parts.push(`title=${error.title}`)
  if (error.message) parts.push(`message=${error.message}`)
  if (error.details) parts.push(`details=${error.details}`)
  return parts.join(', ')
}

function toWebhookLog({
  templateType = 'meta_webhook',
  status = 'Webhook Received',
  detail = '',
  transactionId = '-',
  phone = '-',
}) {
  return {
    id: createId('WLOG'),
    timestamp: new Date().toISOString(),
    templateType,
    trigger: 'meta_webhook',
    transactionId,
    familyName: '-',
    phone,
    status,
    detail,
    initiatedBy: 'meta',
    attempt: 1,
    retryAt: '',
  }
}

function parseDeliveryStatusLogs(payload) {
  const logs = []
  const entries = Array.isArray(payload?.entry) ? payload.entry : []

  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : []
    for (const change of changes) {
      const value = change?.value || {}
      const statuses = Array.isArray(value?.statuses) ? value.statuses : []

      for (const item of statuses) {
        const statusText = String(item?.status || 'unknown').trim()
        const cappedStatus = statusText ? `${statusText[0].toUpperCase()}${statusText.slice(1)}` : 'Unknown'
        const errors = Array.isArray(item?.errors) ? item.errors : []
        const errorText = errors.map((error) => formatMetaError(error)).filter(Boolean).join(' | ')
        const detailParts = []
        if (item?.id) detailParts.push(`messageId=${item.id}`)
        if (item?.conversation?.id) detailParts.push(`conversationId=${item.conversation.id}`)
        if (item?.pricing?.category) detailParts.push(`pricingCategory=${item.pricing.category}`)
        if (item?.timestamp) detailParts.push(`metaTs=${item.timestamp}`)
        if (errorText) detailParts.push(`error=${errorText}`)

        logs.push(
          toWebhookLog({
            templateType: 'meta_delivery_status',
            status: `Delivery ${cappedStatus}`,
            transactionId: String(item?.biz_opaque_callback_data || '-').trim() || '-',
            phone: normalizeWebhookPhone(item?.recipient_id),
            detail: detailParts.join('; ') || 'Delivery update received.',
          }),
        )
      }
    }
  }

  return logs
}

router.get('/', (req, res) => {
  const mode = String(req.query?.['hub.mode'] || '').trim()
  const verifyToken = String(req.query?.['hub.verify_token'] || '').trim()
  const challenge = String(req.query?.['hub.challenge'] || '').trim()

  if (mode !== 'subscribe') {
    return res.status(400).json({ error: 'Invalid hub.mode.' })
  }

  if (!env.whatsappVerifyToken || verifyToken !== env.whatsappVerifyToken) {
    return res.status(403).json({ error: 'Webhook verification failed.' })
  }

  return res.status(200).send(challenge)
})

router.post('/', async (req, res) => {
  try {
    const db = getDb()
    const payload = req.body || {}
    const deliveryLogs = parseDeliveryStatusLogs(payload)
    if (deliveryLogs.length) {
      for (let index = deliveryLogs.length - 1; index >= 0; index -= 1) {
        db.whatsappLogs.unshift(deliveryLogs[index])
      }
    } else {
      db.whatsappLogs.unshift(
        toWebhookLog({
          detail: `entryCount=${Array.isArray(payload.entry) ? payload.entry.length : 0}`,
        }),
      )
    }
    await saveDb()
  } catch (_error) {
    // Meta expects 200 quickly; swallow logging errors here.
  }

  return res.sendStatus(200)
})

module.exports = { whatsappWebhookRoutes: router }
