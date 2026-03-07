const express = require('express')
const fs = require('node:fs')
const path = require('node:path')
const { env } = require('../config/env')
const { badRequest } = require('../utils/http')

const router = express.Router()
const BACKEND_ENV_PATH = path.resolve(__dirname, '../../.env')

function readBearerToken(req) {
  const header = String(req.headers.authorization || '')
  if (!header.startsWith('Bearer ')) return ''
  return header.slice(7).trim()
}

function normalizePhone(value) {
  return String(value || '').replace(/[^\d]/g, '')
}

function readEnvValueFromFile(key) {
  try {
    if (!fs.existsSync(BACKEND_ENV_PATH)) return ''
    const content = fs.readFileSync(BACKEND_ENV_PATH, 'utf8')
    const match = content.match(new RegExp(`^${key}=(.*)$`, 'm'))
    return match?.[1]?.trim() || ''
  } catch (_error) {
    return ''
  }
}

function buildTextBody({ to, message, callbackData = '' }) {
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: {
      body: String(message || '').slice(0, 4096),
    },
  }
  if (callbackData) {
    payload.biz_opaque_callback_data = String(callbackData).slice(0, 512)
  }
  return payload
}

function buildTemplateBody({
  to,
  templateName,
  templateLanguage,
  callbackData = '',
  templateBodyParams = [],
}) {
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: {
        code: templateLanguage || 'en_US',
      },
    },
  }
  if (Array.isArray(templateBodyParams) && templateBodyParams.length) {
    payload.template.components = [
      {
        type: 'body',
        parameters: templateBodyParams.map((value) => ({
          type: 'text',
          text: String(value || '').slice(0, 1024),
        })),
      },
    ]
  }
  if (callbackData) {
    payload.biz_opaque_callback_data = String(callbackData).slice(0, 512)
  }
  return payload
}

function parseMetaErrorCode(payload) {
  const code = Number(payload?.error?.code)
  return Number.isFinite(code) ? code : null
}

async function sendMetaPayload({ url, token, body }) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  const raw = await response.text()
  let payload = raw
  try {
    payload = JSON.parse(raw)
  } catch (_error) {}

  return {
    ok: response.ok,
    status: response.status,
    payload,
  }
}

router.post('/send', async (req, res, next) => {
  try {
    const token = readBearerToken(req) || env.whatsappAccessToken || readEnvValueFromFile('WHATSAPP_ACCESS_TOKEN')
    const phoneNumberId = String(
      env.whatsappPhoneNumberId ||
        readEnvValueFromFile('WHATSAPP_PHONE_NUMBER_ID') ||
        req.body?.meta?.phoneNumberId ||
        req.body?.phoneNumberId ||
        '',
    ).trim()
    const graphVersion = String(
      env.whatsappGraphVersion || readEnvValueFromFile('WHATSAPP_GRAPH_VERSION') || 'v25.0',
    ).trim()
    const to = normalizePhone(req.body?.to)
    const message = String(req.body?.message || '').trim()
    const callbackData = String(
      req.body?.meta?.transactionId || req.body?.meta?.callbackData || req.body?.transactionId || '',
    ).trim()
    const useTemplate = Boolean(req.body?.meta?.useTemplate)
    const templateName = String(
      req.body?.meta?.templateName || readEnvValueFromFile('WHATSAPP_TEMPLATE_INSTANT_RECEIPT') || '',
    ).trim()
    const templateLanguage = String(
      req.body?.meta?.templateLanguage || readEnvValueFromFile('WHATSAPP_TEMPLATE_LANGUAGE') || 'en_US',
    ).trim()
    const templateBodyText = String(req.body?.meta?.templateBodyText || '').trim()
    const templateBodyParams = Array.isArray(req.body?.meta?.templateBodyParams)
      ? req.body.meta.templateBodyParams
      : templateBodyText
      ? [templateBodyText]
      : []
    const sendFollowupText = Boolean(req.body?.meta?.sendFollowupText)
    const followupText = String(req.body?.meta?.followupText || message).trim()

    if (!token) {
      throw badRequest('Missing WhatsApp access token for adapter dispatch.')
    }
    if (!phoneNumberId) {
      throw badRequest('WHATSAPP_PHONE_NUMBER_ID is required for Meta adapter.')
    }
    if (!to) {
      throw badRequest('Destination phone is required.')
    }
    if (!useTemplate && !message) {
      throw badRequest('Message body is required.')
    }
    if (useTemplate && !templateName) {
      throw badRequest('Template name is required when template mode is enabled.')
    }

    const url = `https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`
    if (!useTemplate) {
      const textAttempt = await sendMetaPayload({
        url,
        token,
        body: buildTextBody({
          to,
          message,
          callbackData,
        }),
      })

      if (!textAttempt.ok) {
        return res.status(textAttempt.status).json({
          error: 'Meta adapter send failed.',
          detail: textAttempt.payload,
        })
      }

      return res.json({
        sent: true,
        provider: 'Meta WhatsApp Cloud API',
        mode: 'text_only',
        result: textAttempt.payload,
      })
    }

    const templateWithParamsAttempt = await sendMetaPayload({
      url,
      token,
      body: buildTemplateBody({
        to,
        templateName,
        templateLanguage,
        callbackData,
        templateBodyParams,
      }),
    })

    let templateAttempt = templateWithParamsAttempt
    const paramMismatchCode = parseMetaErrorCode(templateWithParamsAttempt.payload)
    if (!templateWithParamsAttempt.ok && templateBodyParams.length > 0 && paramMismatchCode === 132000) {
      templateAttempt = await sendMetaPayload({
        url,
        token,
        body: buildTemplateBody({
          to,
          templateName,
          templateLanguage,
          callbackData,
          templateBodyParams: [],
        }),
      })
    }

    if (!templateAttempt.ok) {
      return res.status(templateAttempt.status).json({
        error: 'Meta adapter send failed.',
        detail: templateAttempt.payload,
      })
    }

    if (!sendFollowupText || !followupText) {
      return res.json({
        sent: true,
        provider: 'Meta WhatsApp Cloud API',
        mode: 'template_only',
        result: templateAttempt.payload,
      })
    }

    const followupAttempt = await sendMetaPayload({
      url,
      token,
      body: buildTextBody({
        to,
        message: followupText,
        callbackData,
      }),
    })

    return res.json({
      sent: true,
      provider: 'Meta WhatsApp Cloud API',
      mode: 'template_then_text',
      result: templateAttempt.payload,
      followupSent: followupAttempt.ok,
      followupStatus: followupAttempt.status,
      followupResult: followupAttempt.payload,
    })
  } catch (error) {
    return next(error)
  }
})

module.exports = { whatsappAdapterRoutes: router }
