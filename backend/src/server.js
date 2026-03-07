const { app } = require('./app')
const { env } = require('./config/env')
const { closeStore, getDb, getStorageMode, initStore, saveDb } = require('./store/db')
const { generateReceiptPdf } = require('./services/receiptService')
const { startDueReminderCron, startWhatsAppRetryCron } = require('./services/cronService')
const { ensureReceiptMetadata } = require('./services/receiptTrustService')

async function ensureSeedReceipts() {
  const db = getDb()
  let changed = false

  for (const transaction of db.transactions) {
    if (transaction.status !== 'Paid') continue

    const beforeMeta = JSON.stringify({
      receiptNumber: transaction.receiptNumber || '',
      receiptIssuedAt: transaction.receiptIssuedAt || '',
      receiptVerificationHash: transaction.receiptVerificationHash || '',
      receiptVerificationUrl: transaction.receiptVerificationUrl || '',
    })
    ensureReceiptMetadata(db, transaction)
    const afterMeta = JSON.stringify({
      receiptNumber: transaction.receiptNumber || '',
      receiptIssuedAt: transaction.receiptIssuedAt || '',
      receiptVerificationHash: transaction.receiptVerificationHash || '',
      receiptVerificationUrl: transaction.receiptVerificationUrl || '',
    })
    if (beforeMeta !== afterMeta) {
      changed = true
    }
    if (transaction.receiptPath) continue

    const familyName =
      transaction.type === 'Gupt Daan'
        ? 'Anonymous (Gupt Daan)'
        : db.families.find((family) => family.familyId === transaction.familyId)?.headName || 'Unknown'

    const receipt = await generateReceiptPdf({
      transaction,
      familyName,
      mandirProfile: db.mandirProfile,
      munimName: transaction.receiptGeneratedBy || 'System Seed',
      verificationUrl: transaction.receiptVerificationUrl || '',
    })

    transaction.receiptPath = receipt.receiptPath
    transaction.receiptFileName = receipt.receiptFileName
    if (!transaction.receiptGeneratedBy) transaction.receiptGeneratedBy = 'System Seed'
    changed = true
  }

  if (changed) {
    await saveDb()
  }
}

async function bootstrap() {
  await initStore()
  await ensureSeedReceipts()
  startDueReminderCron()
  startWhatsAppRetryCron()

  const server = app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`JMMS backend running on http://localhost:${env.port}`)
    // eslint-disable-next-line no-console
    console.log(`Active data store: ${getStorageMode()}`)
  })

  const gracefulShutdown = async () => {
    server.close(async () => {
      await closeStore()
      process.exit(0)
    })
  }

  process.on('SIGINT', gracefulShutdown)
  process.on('SIGTERM', gracefulShutdown)
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start backend:', error)
  process.exit(1)
})
