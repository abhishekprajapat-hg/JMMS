const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const { env } = require('./config/env')
const { authenticate } = require('./middleware/auth')
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler')
const { authRoutes } = require('./routes/authRoutes')
const { dashboardRoutes } = require('./routes/dashboardRoutes')
const { familyRoutes } = require('./routes/familyRoutes')
const { transactionRoutes } = require('./routes/transactionRoutes')
const { inventoryRoutes } = require('./routes/inventoryRoutes')
const { schedulerRoutes } = require('./routes/schedulerRoutes')
const { whatsappRoutes } = require('./routes/whatsappRoutes')
const { whatsappAdapterRoutes } = require('./routes/whatsappAdapterRoutes')
const { whatsappWebhookRoutes } = require('./routes/whatsappWebhookRoutes')
const { systemRoutes } = require('./routes/systemRoutes')
const { approvalRoutes } = require('./routes/approvalRoutes')
const { paymentRoutes } = require('./routes/paymentRoutes')
const { portalRoutes } = require('./routes/portalRoutes')
const { expenseRoutes } = require('./routes/expenseRoutes')
const { accountingRoutes } = require('./routes/accountingRoutes')
const { eventRoutes } = require('./routes/eventRoutes')
const { publicRoutes } = require('./routes/publicRoutes')
const { userRoutes } = require('./routes/userRoutes')
const { contentRoutes } = require('./routes/contentRoutes')
const { getReceiptDirPath, getUploadDirPath } = require('./store/db')

function safelyDecodePathSegment(value) {
  try {
    return decodeURIComponent(String(value || ''))
  } catch (_error) {
    return String(value || '')
  }
}

function normalizeReceiptRequestUrl(requestUrl = '') {
  const rawValue = String(requestUrl || '')
  const [pathname, search = ''] = rawValue.split('?')
  const decodedPathname = safelyDecodePathSegment(pathname)
  const normalizedPathname = decodedPathname
    .replace(/^\/+/, '/')
    .replace(/^\/+(?:\{\{\d+\}\}|\{\d+\})+/, '/')
    .replace(/^\/+/, '/')

  if (normalizedPathname === pathname) {
    return rawValue
  }

  return `${normalizedPathname}${search ? `?${search}` : ''}`
}

const app = express()
app.disable('etag')
const allowedOrigins = new Set(env.frontendOrigins || [env.frontendOrigin])

app.use(helmet())
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true)
      }
      return callback(null, allowedOrigins.has(origin))
    },
    credentials: true,
  }),
)
app.use(express.json({ limit: '40mb' }))
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'))
app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  res.set('Pragma', 'no-cache')
  res.set('Expires', '0')
  next()
})

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'punyanidhi-backend',
    timestamp: new Date().toISOString(),
  })
})

app.use('/receipts', (req, _res, next) => {
  req.url = normalizeReceiptRequestUrl(req.url)
  next()
})
app.use('/receipts', express.static(getReceiptDirPath()))
app.use('/uploads', express.static(getUploadDirPath()))
app.use('/api/system', systemRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/whatsapp/webhook', whatsappWebhookRoutes)
app.use('/api/whatsapp/adapter', whatsappAdapterRoutes)
app.use('/api/public', publicRoutes)
app.use('/api/user', userRoutes)

app.use('/api', authenticate)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/families', familyRoutes)
app.use('/api/transactions', transactionRoutes)
app.use('/api/inventory', inventoryRoutes)
app.use('/api/scheduler', schedulerRoutes)
app.use('/api/whatsapp', whatsappRoutes)
app.use('/api/approvals', approvalRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/portal', portalRoutes)
app.use('/api/expenses', expenseRoutes)
app.use('/api/accounting', accountingRoutes)
app.use('/api/events', eventRoutes)
app.use('/api/content', contentRoutes)

app.use(notFoundHandler)
app.use(errorHandler)

module.exports = { app, normalizeReceiptRequestUrl }
