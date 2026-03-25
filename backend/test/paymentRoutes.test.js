const test = require('node:test')
const assert = require('node:assert/strict')

const routeModulePath = require.resolve('../src/routes/paymentRoutes')
const dbModulePath = require.resolve('../src/store/db')
const receiptServiceModulePath = require.resolve('../src/services/receiptService')
const whatsappServiceModulePath = require.resolve('../src/services/whatsappService')

function createDb({ paymentIntentStatus = 'Pending', transactionStatus = 'Pledged' } = {}) {
  return {
    mandirs: [
      {
        id: 'MANDIR-001',
        name: 'Shri Jain Shwetambar Mandir',
        address: 'Jaipur',
        pan: 'PAN001',
        reg80G: '80G001',
        trustNumber: 'TRUST-001',
        letterhead: 'Mandir Trust',
        isActive: true,
      },
    ],
    mandirProfile: {
      name: 'Shri Jain Shwetambar Mandir',
      address: 'Jaipur',
      pan: 'PAN001',
      reg80G: '80G001',
      trustNumber: 'TRUST-001',
      letterhead: 'Mandir Trust',
    },
    jobs: {
      nextReceiptSequence: 1,
      receiptSignatureSecret: 'test-secret',
    },
    families: [
      {
        familyId: 'FAM-001',
        headName: 'Amit Jain',
        whatsapp: '+919876543210',
        mandirId: 'MANDIR-001',
      },
    ],
    transactions: [
      {
        id: 'TRX-001',
        familyId: 'FAM-001',
        type: 'Bhent',
        fundCategory: 'General Fund',
        status: transactionStatus,
        amount: 1100,
        createdAt: '2026-03-22T10:00:00.000Z',
        paidAt: transactionStatus === 'Paid' ? '2026-03-22T12:00:00.000Z' : '',
        dueDate: transactionStatus === 'Pledged' ? '2026-03-25' : '',
        cancelled: false,
        cancellationReason: '',
        cancellationAt: '',
        receiptPath: '',
        receiptFileName: '',
        receiptGeneratedBy: '',
        receiptNumber: '',
        receiptIssuedAt: '',
        receiptVerificationHash: '',
        receiptVerificationUrl: '',
        mandirId: 'MANDIR-001',
      },
    ],
    paymentIntents: [
      {
        id: 'PAY-001',
        familyId: 'FAM-001',
        linkedTransactionId: 'TRX-001',
        amount: 1100,
        gateway: 'Direct UPI (No Commission)',
        status: paymentIntentStatus,
        initiatedAt: '2026-03-22T09:00:00.000Z',
        reconciledAt: '',
        providerReference: '',
        failureReason: '',
        createdBy: 'Amit Jain',
        source: 'devotee_site',
        note: 'Test payment',
        transactionType: 'Bhent',
        fundCategory: 'General Fund',
        payerUtr: 'UTR12345678',
        payerName: 'Amit Jain',
        proofSubmittedAt: '2026-03-22T09:30:00.000Z',
        mandirId: 'MANDIR-001',
      },
    ],
  }
}

function loadRouteWithMocks(db) {
  const originalDbModule = require.cache[dbModulePath]
  const originalReceiptModule = require.cache[receiptServiceModulePath]
  const originalWhatsappModule = require.cache[whatsappServiceModulePath]
  const originalRouteModule = require.cache[routeModulePath]

  let saveCount = 0
  let receiptCalls = 0
  const whatsappCalls = []

  require.cache[dbModulePath] = {
    id: dbModulePath,
    filename: dbModulePath,
    loaded: true,
    exports: {
      getDb: () => db,
      saveDb: async () => {
        saveCount += 1
      },
    },
  }

  require.cache[receiptServiceModulePath] = {
    id: receiptServiceModulePath,
    filename: receiptServiceModulePath,
    loaded: true,
    exports: {
      generateReceiptPdf: async ({ transaction }) => {
        receiptCalls += 1
        return {
          receiptPath: `/receipts/${transaction.id}-${receiptCalls}.pdf`,
          receiptFileName: `${transaction.id}-${receiptCalls}.pdf`,
        }
      },
    },
  }

  require.cache[whatsappServiceModulePath] = {
    id: whatsappServiceModulePath,
    filename: whatsappServiceModulePath,
    loaded: true,
    exports: {
      sendWhatsAppTemplate: async (payload) => {
        whatsappCalls.push(payload)
        return {
          status: 'Sent',
          familyName: 'Amit Jain',
          phone: '+919876543210',
          detail: 'ok',
        }
      },
    },
  }

  delete require.cache[routeModulePath]
  const { paymentRoutes } = require('../src/routes/paymentRoutes')

  function restore() {
    delete require.cache[routeModulePath]

    if (originalDbModule) {
      require.cache[dbModulePath] = originalDbModule
    } else {
      delete require.cache[dbModulePath]
    }

    if (originalReceiptModule) {
      require.cache[receiptServiceModulePath] = originalReceiptModule
    } else {
      delete require.cache[receiptServiceModulePath]
    }

    if (originalWhatsappModule) {
      require.cache[whatsappServiceModulePath] = originalWhatsappModule
    } else {
      delete require.cache[whatsappServiceModulePath]
    }

    if (originalRouteModule) {
      require.cache[routeModulePath] = originalRouteModule
    }
  }

  return {
    paymentRoutes,
    restore,
    getSaveCount: () => saveCount,
    getReceiptCallCount: () => receiptCalls,
    getWhatsappCalls: () => whatsappCalls,
  }
}

function getReconcileHandler(paymentRoutes) {
  return getRouteHandler(paymentRoutes, '/:paymentId/reconcile')
}

function getResendReceiptHandler(paymentRoutes) {
  return getRouteHandler(paymentRoutes, '/:paymentId/resend-receipt')
}

function getRouteHandler(paymentRoutes, path) {
  const layer = paymentRoutes.stack.find(
    (entry) => entry.route?.path === path && entry.route.methods?.post,
  )
  assert.ok(layer, `${path} route should exist`)
  return layer.route.stack.at(-1).handle
}

async function invokeRoute(handler, { body = {} } = {}) {
  const req = {
    params: { paymentId: 'PAY-001' },
    body,
    user: {
      username: 'admin',
      fullName: 'Admin User',
      role: 'admin',
    },
  }
  const res = {
    statusCode: 200,
    status(code) {
      this.statusCode = code
      return this
    },
    json(payload) {
      this.payload = payload
      return payload
    },
  }

  let nextError = null
  await handler(req, res, (error) => {
    nextError = error
  })
  if (nextError) {
    throw nextError
  }
  return res
}

test('reconcile sends WhatsApp receipt for newly paid linked transactions', async () => {
  const db = createDb({ transactionStatus: 'Pledged' })
  const { paymentRoutes, restore, getSaveCount, getReceiptCallCount, getWhatsappCalls } = loadRouteWithMocks(db)

  try {
    const handler = getReconcileHandler(paymentRoutes)
    const response = await invokeRoute(handler, {
      body: {
        outcome: 'success',
        providerReference: 'UTR12345678',
        transactionType: 'Bhent',
        fundCategory: 'General Fund',
      },
    })

    assert.equal(response.payload.paymentIntent.status, 'Success')
    assert.equal(response.payload.settledTransaction.status, 'Paid')
    assert.equal(response.payload.settledTransaction.dueDate, '')
    assert.ok(response.payload.settledTransaction.paidAt)
    assert.equal(response.payload.whatsappLog.status, 'Sent')
    assert.equal(getReceiptCallCount(), 1)
    assert.equal(getWhatsappCalls().length, 1)
    assert.equal(getSaveCount(), 1)
  } finally {
    restore()
  }
})

test('reconcile sends WhatsApp receipt even when linked transaction is already paid', async () => {
  const db = createDb({ transactionStatus: 'Paid' })
  const { paymentRoutes, restore, getReceiptCallCount, getWhatsappCalls } = loadRouteWithMocks(db)

  try {
    const handler = getReconcileHandler(paymentRoutes)
    const response = await invokeRoute(handler, {
      body: {
        outcome: 'success',
        providerReference: 'UTR12345678',
        transactionType: 'Bhent',
        fundCategory: 'General Fund',
      },
    })

    assert.equal(response.payload.paymentIntent.status, 'Success')
    assert.equal(response.payload.settledTransaction.status, 'Paid')
    assert.match(response.payload.settledTransaction.receiptPath, /^\/receipts\/TRX-001-1\.pdf$/)
    assert.equal(response.payload.whatsappLog.status, 'Sent')
    assert.equal(getReceiptCallCount(), 1)
    assert.equal(getWhatsappCalls().length, 1)
    assert.equal(getWhatsappCalls()[0].transaction.id, 'TRX-001')
  } finally {
    restore()
  }
})

test('resend-receipt sends WhatsApp receipt again for successful payment intents', async () => {
  const db = createDb({ transactionStatus: 'Paid' })
  db.paymentIntents[0].status = 'Success'
  db.paymentIntents[0].reconciledAt = '2026-03-22T12:01:00.000Z'

  const { paymentRoutes, restore, getSaveCount, getReceiptCallCount, getWhatsappCalls } = loadRouteWithMocks(db)

  try {
    const handler = getResendReceiptHandler(paymentRoutes)
    const response = await invokeRoute(handler)

    assert.equal(response.payload.paymentIntent.status, 'Success')
    assert.equal(response.payload.settledTransaction.status, 'Paid')
    assert.equal(response.payload.whatsappLog.status, 'Sent')
    assert.equal(getReceiptCallCount(), 1)
    assert.equal(getWhatsappCalls().length, 1)
    assert.equal(getWhatsappCalls()[0].trigger, 'manual_receipt_retry')
    assert.equal(getSaveCount(), 1)
  } finally {
    restore()
  }
})
