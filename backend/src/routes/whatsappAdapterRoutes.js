const express = require('express')
const fs = require('node:fs')
const path = require('node:path')
const { env } = require('../config/env')
const { badRequest } = require('../utils/http')
const { isPlaceholderMetaTemplateName } = require('../utils/whatsappTemplates')

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

function readBooleanEnvValueFromFile(key, fallback = false) {
  const raw = readEnvValueFromFile(key)
  if (!raw) return Boolean(fallback)
  return String(raw).trim().toLowerCase() === 'true'
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
  templateButtonUrlParams = [],
  templateButtonUrlIndex = '0',
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
  const components = []
  if (Array.isArray(templateBodyParams) && templateBodyParams.length) {
    components.push({
      type: 'body',
      parameters: templateBodyParams.map((value) => ({
        type: 'text',
        text: String(value || '').slice(0, 1024),
      })),
    })
  }
  if (Array.isArray(templateButtonUrlParams) && templateButtonUrlParams.length) {
    components.push({
      type: 'button',
      sub_type: 'url',
      index: String(templateButtonUrlIndex || '0'),
      parameters: templateButtonUrlParams.map((value) => ({
        type: 'text',
        text: String(value || '').slice(0, 1024),
      })),
    })
  }
  if (components.length) {
    payload.template.components = components
  }
  if (callbackData) {
    payload.biz_opaque_callback_data = String(callbackData).slice(0, 512)
  }
  return payload
}

function buildDocumentBody({ to, documentUrl, documentFilename = '', caption = '', callbackData = '' }) {
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'document',
    document: {
      link: String(documentUrl || '').trim(),
    },
  }
  if (documentFilename) {
    payload.document.filename = String(documentFilename || '').trim().slice(0, 240)
  }
  if (caption) {
    payload.document.caption = String(caption || '').trim().slice(0, 1024)
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

async function sendMetaContent({
  url,
  token,
  to,
  callbackData,
  message,
  documentUrl = '',
  documentFilename = '',
  documentCaption = '',
}) {
  const normalizedDocumentUrl = String(documentUrl || '').trim()
  if (normalizedDocumentUrl) {
    const documentAttempt = await sendMetaPayload({
      url,
      token,
      body: buildDocumentBody({
        to,
        documentUrl: normalizedDocumentUrl,
        documentFilename,
        caption: documentCaption || message,
        callbackData,
      }),
    })
    if (documentAttempt.ok || !message) {
      return {
        ...documentAttempt,
        mode: 'document_only',
        kind: 'document',
      }
    }
  }

  const textAttempt = await sendMetaPayload({
    url,
    token,
    body: buildTextBody({
      to,
      message,
      callbackData,
    }),
  })

  return {
    ...textAttempt,
    mode: 'text_only',
    kind: 'text',
  }
}

async function sendMetaContentWithOptionalTextFollowup({
  url,
  token,
  to,
  callbackData,
  message,
  documentUrl = '',
  documentFilename = '',
  documentCaption = '',
  sendTextFollowup = false,
}) {
  const primaryAttempt = await sendMetaContent({
    url,
    token,
    to,
    callbackData,
    message,
    documentUrl,
    documentFilename,
    documentCaption,
  })

  if (!primaryAttempt.ok || !sendTextFollowup || !message || primaryAttempt.kind !== 'document') {
    return primaryAttempt
  }

  const textFollowupAttempt = await sendMetaPayload({
    url,
    token,
    body: buildTextBody({
      to,
      message,
      callbackData,
    }),
  })

  return {
    ...primaryAttempt,
    mode: 'document_then_text',
    followupSent: textFollowupAttempt.ok,
    followupStatus: textFollowupAttempt.status,
    followupResult: textFollowupAttempt.payload,
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
    const templateButtonUrlParams = Array.isArray(req.body?.meta?.templateButtonUrlParams)
      ? req.body.meta.templateButtonUrlParams
      : []
    const templateButtonUrlIndex = String(req.body?.meta?.templateButtonUrlIndex || '0').trim() || '0'
    const sendFollowupText = Boolean(req.body?.meta?.sendFollowupText)
    const followupText = String(req.body?.meta?.followupText || message).trim()
    const followupDocumentUrl = String(req.body?.meta?.followupDocumentUrl || '').trim()
    const followupDocumentFilename = String(req.body?.meta?.followupDocumentFilename || '').trim()
    const followupDocumentCaption = String(req.body?.meta?.followupDocumentCaption || followupText).trim()
    const allowSampleTemplate =
      Boolean(req.body?.meta?.allowSampleTemplate) ||
      readBooleanEnvValueFromFile('WHATSAPP_ALLOW_SAMPLE_TEMPLATE', env.whatsappAllowSampleTemplate)

    if (!token) {
      throw badRequest('Missing WhatsApp access token for adapter dispatch.')
    }
    if (!phoneNumberId) {
      throw badRequest('WHATSAPP_PHONE_NUMBER_ID is required for Meta adapter.')
    }
    if (!to) {
      throw badRequest('Destination phone is required.')
    }
    if (!useTemplate && !message && !followupDocumentUrl) {
      throw badRequest('Message body or receipt document is required.')
    }
    if (useTemplate && !templateName) {
      throw badRequest('Template name is required when template mode is enabled.')
    }
    if (useTemplate && isPlaceholderMetaTemplateName(templateName) && !allowSampleTemplate) {
      throw badRequest('Meta sample template "hello_world" cannot be used for live notifications.')
    }

    const url = `https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`
    if (!useTemplate) {
      const directAttempt = await sendMetaContentWithOptionalTextFollowup({
        url,
        token,
        to,
        callbackData,
        message,
        documentUrl: followupDocumentUrl,
        documentFilename: followupDocumentFilename,
        documentCaption: followupDocumentCaption,
        sendTextFollowup: sendFollowupText,
      })

      if (!directAttempt.ok) {
        return res.status(directAttempt.status).json({
          error: 'Meta adapter send failed.',
          detail: directAttempt.payload,
        })
      }

      return res.json({
        sent: true,
        provider: 'Meta WhatsApp Cloud API',
        mode: directAttempt.mode,
        result: directAttempt.payload,
        followupSent: directAttempt.followupSent,
        followupStatus: directAttempt.followupStatus,
        followupResult: directAttempt.followupResult,
      })
    }

    const canBypassSampleTemplate =
      isPlaceholderMetaTemplateName(templateName) && (followupDocumentUrl || followupText || message)
    if (canBypassSampleTemplate) {
      const directAttempt = await sendMetaContentWithOptionalTextFollowup({
        url,
        token,
        to,
        callbackData,
        message: followupText || message,
        documentUrl: followupDocumentUrl,
        documentFilename: followupDocumentFilename,
        documentCaption: followupDocumentCaption,
        sendTextFollowup: sendFollowupText,
      })

      if (directAttempt.ok) {
        return res.json({
          sent: true,
          provider: 'Meta WhatsApp Cloud API',
          mode: directAttempt.mode,
          result: directAttempt.payload,
          followupSent: directAttempt.followupSent,
          followupStatus: directAttempt.followupStatus,
          followupResult: directAttempt.followupResult,
          bypassedSampleTemplate: true,
        })
      }
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
        templateButtonUrlParams,
        templateButtonUrlIndex,
      }),
    })

    let templateAttempt = templateWithParamsAttempt
    const paramMismatchCode = parseMetaErrorCode(templateWithParamsAttempt.payload)
    if (
      !templateWithParamsAttempt.ok &&
      paramMismatchCode === 132000 &&
      (templateBodyParams.length > 0 || templateButtonUrlParams.length > 0)
    ) {
      templateAttempt = await sendMetaPayload({
        url,
        token,
        body: buildTemplateBody({
          to,
          templateName,
          templateLanguage,
          callbackData,
          templateBodyParams: [],
          templateButtonUrlParams: [],
          templateButtonUrlIndex,
        }),
      })
    }

    if (!templateAttempt.ok) {
      return res.status(templateAttempt.status).json({
        error: 'Meta adapter send failed.',
        detail: templateAttempt.payload,
      })
    }

    if ((!sendFollowupText || !followupText) && !followupDocumentUrl) {
      return res.json({
        sent: true,
        provider: 'Meta WhatsApp Cloud API',
        mode: 'template_only',
        result: templateAttempt.payload,
      })
    }

    const followupAttempt = await sendMetaContent({
      url,
      token,
      to,
      callbackData,
      message: followupText,
      documentUrl: followupDocumentUrl,
      documentFilename: followupDocumentFilename,
      documentCaption: followupDocumentCaption,
    })

    return res.json({
      sent: true,
      provider: 'Meta WhatsApp Cloud API',
      mode: followupAttempt.kind === 'document' ? 'template_then_document' : 'template_then_text',
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
