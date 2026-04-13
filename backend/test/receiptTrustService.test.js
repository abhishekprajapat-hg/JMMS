const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const test = require('node:test')
const assert = require('node:assert/strict')

const receiptTrustModulePath = require.resolve('../src/services/receiptTrustService')

test('ensureReceiptMetadata reads the latest receipt base URL from backend env file', async () => {
  const runtimeEnvDir = fs.mkdtempSync(path.join(os.tmpdir(), 'punyanidhi-receipt-runtime-'))
  const runtimeEnvPath = path.join(runtimeEnvDir, '.env')
  const originalRuntimeEnvPath = process.env.PUNYANIDHI_RUNTIME_ENV_PATH
  process.env.PUNYANIDHI_RUNTIME_ENV_PATH = runtimeEnvPath

  fs.writeFileSync(runtimeEnvPath, 'RECEIPT_PUBLIC_BASE_URL=https://first.example\n', 'utf8')
  delete require.cache[receiptTrustModulePath]
  const { ensureReceiptMetadata } = require('../src/services/receiptTrustService')

  const db = {
    jobs: {
      nextReceiptSequence: 1,
      receiptSignatureSecret: 'unit-test-secret',
    },
  }
  const transaction = {
    id: 'TRX-001',
    familyId: 'FAM-001',
    amount: 501,
    type: 'Bhent',
    fundCategory: 'Mandir Nirman',
    status: 'Paid',
    createdAt: '2026-03-25T06:00:00.000Z',
    paidAt: '2026-03-25T06:00:00.000Z',
  }

  try {
    ensureReceiptMetadata(db, transaction)
    assert.match(transaction.receiptVerificationUrl, /^https:\/\/first\.example\//)

    fs.writeFileSync(runtimeEnvPath, 'RECEIPT_PUBLIC_BASE_URL=https://second.example\n', 'utf8')
    ensureReceiptMetadata(db, transaction)
    assert.match(transaction.receiptVerificationUrl, /^https:\/\/second\.example\//)
  } finally {
    fs.rmSync(runtimeEnvDir, { recursive: true, force: true })
    if (originalRuntimeEnvPath === undefined) {
      delete process.env.PUNYANIDHI_RUNTIME_ENV_PATH
    } else {
      process.env.PUNYANIDHI_RUNTIME_ENV_PATH = originalRuntimeEnvPath
    }
    delete require.cache[receiptTrustModulePath]
  }
})
