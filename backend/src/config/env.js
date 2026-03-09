const path = require('node:path')
const fs = require('node:fs')
const dotenv = require('dotenv')

const backendEnvPath = path.resolve(__dirname, '../../.env')
if (fs.existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath })
}

const cwdEnvPath = path.resolve(process.cwd(), '.env')
if (cwdEnvPath !== backendEnvPath && fs.existsSync(cwdEnvPath)) {
  dotenv.config({ path: cwdEnvPath, override: true })
}

function toNumber(value, fallback) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function toStringList(value, fallback = []) {
  const source = String(value || '')
  if (!source.trim()) return fallback
  return source
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

const defaultOrigins = ['http://localhost:5173', 'http://localhost:5174']
const configuredOrigins = toStringList(process.env.FRONTEND_ORIGINS)
const frontendOrigins = configuredOrigins.length
  ? configuredOrigins
  : toStringList(process.env.FRONTEND_ORIGIN, defaultOrigins)

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: toNumber(process.env.PORT, 4000),
  jwtSecret: process.env.JWT_SECRET || 'jmms_dev_secret_change_me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',
  devoteeJwtExpiresIn: process.env.DEVOTEE_JWT_EXPIRES_IN || '30d',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || `${process.env.JWT_SECRET || 'jmms_dev_secret_change_me'}_refresh`,
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  frontendOrigins,
  timezone: process.env.APP_TIMEZONE || 'Asia/Kolkata',
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/jmms',
  dataDir: process.env.DATA_DIR || path.resolve(process.cwd(), 'data'),
  receiptPublicBaseUrl: process.env.RECEIPT_PUBLIC_BASE_URL || '',
  whatsappVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN || '',
  whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  whatsappGraphVersion: process.env.WHATSAPP_GRAPH_VERSION || 'v25.0',
  whatsappUseTemplateForReceipts: String(process.env.WHATSAPP_USE_TEMPLATE_FOR_RECEIPTS || '').toLowerCase() === 'true',
  whatsappTemplateInstantReceipt: process.env.WHATSAPP_TEMPLATE_INSTANT_RECEIPT || '',
  whatsappTemplatePledgeReminder: process.env.WHATSAPP_TEMPLATE_PLEDGE_REMINDER || '',
  whatsappTemplateLanguage: process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en_US',
  whatsappTemplatePassFullMessageAsBodyParam:
    String(process.env.WHATSAPP_TEMPLATE_PASS_FULL_MESSAGE_AS_BODY_PARAM || '').toLowerCase() === 'true',
  whatsappTemplateSendFollowupText:
    String(process.env.WHATSAPP_TEMPLATE_SEND_FOLLOWUP_TEXT || '').toLowerCase() === 'true',
}

module.exports = { env }
