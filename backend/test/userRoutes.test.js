const test = require('node:test')
const assert = require('node:assert/strict')

const routeModulePath = require.resolve('../src/routes/userRoutes')
const dbModulePath = require.resolve('../src/store/db')

function createDb() {
  return {
    mandirs: [
      {
        id: 'MANDIR-001',
        name: 'Shri Digambar Jain Sarvoday Dharmik and Parmarthik Trust',
        address: 'Jaipur',
        pan: 'PAN001',
        reg80G: '80G001',
        trustNumber: 'TRUST-001',
        letterhead: 'Mandir Trust',
        isActive: true,
      },
    ],
    mandirProfile: {
      name: 'Shri Digambar Jain Sarvoday Dharmik and Parmarthik Trust',
      address: 'Jaipur',
      pan: 'PAN001',
      reg80G: '80G001',
      trustNumber: 'TRUST-001',
      letterhead: 'Mandir Trust',
    },
    paymentPortal: {
      upiVpa: '',
      payeeName: 'Shri Digambar Jain Sarvoday Dharmik and Parmarthik Trust',
      bankName: '',
      accountNumber: '',
      ifsc: '',
      updatedAt: '',
      mandirId: 'MANDIR-001',
    },
    families: [
      {
        familyId: 'FAM-001',
        headName: 'Amit Jain',
        gotra: 'Kashyap',
        whatsapp: '+919876543210',
        address: 'Jaipur',
        mandirId: 'MANDIR-001',
      },
    ],
    devoteeUsers: [
      {
        id: 'DVT-001',
        familyId: 'FAM-001',
        mandirId: 'MANDIR-001',
        fullName: 'Amit Jain',
        email: 'amit@example.com',
        whatsapp: '+919876543210',
        passwordHash: 'hash',
        createdAt: '2026-03-01T00:00:00.000Z',
        lastLoginAt: '',
        status: 'active',
      },
    ],
    devoteeAffiliations: [
      {
        id: 'AFF-001',
        devoteeUserId: 'DVT-001',
        mandirId: 'MANDIR-001',
        familyId: 'FAM-001',
        isPrimary: true,
        joinedAt: '2026-03-01T00:00:00.000Z',
        status: 'active',
      },
    ],
    events: [
      {
        id: 'EVT-001',
        name: 'Mahotsav Sabha',
        date: '2026-04-20',
        hall: 'Main Sabha Hall',
        capacity: 20,
        feePerFamily: 500,
        mandirId: 'MANDIR-001',
      },
    ],
    eventRegistrations: [],
    transactions: [],
    paymentIntents: [],
    poojaBookings: [],
  }
}

function loadRouteWithMocks(db) {
  const originalDbModule = require.cache[dbModulePath]
  const originalRouteModule = require.cache[routeModulePath]

  let saveCount = 0
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

  delete require.cache[routeModulePath]
  const { userRoutes } = require('../src/routes/userRoutes')

  function restore() {
    delete require.cache[routeModulePath]
    if (originalDbModule) {
      require.cache[dbModulePath] = originalDbModule
    } else {
      delete require.cache[dbModulePath]
    }

    if (originalRouteModule) {
      require.cache[routeModulePath] = originalRouteModule
    }
  }

  return {
    userRoutes,
    restore,
    getSaveCount: () => saveCount,
  }
}

function getRegisterHandler(userRoutes) {
  const layer = userRoutes.stack.find(
    (entry) => entry.route?.path === '/events/:eventId/register' && entry.route.methods?.post,
  )
  assert.ok(layer, 'event self-registration route should exist')
  return layer.route.stack.at(-1).handle
}

async function invokeRoute(handler, { db, body = {}, params = {} } = {}) {
  const req = {
    params: {
      eventId: 'EVT-001',
      ...params,
    },
    body,
    devotee: {
      sub: 'DVT-001',
      familyId: 'FAM-001',
      mandirId: 'MANDIR-001',
      whatsapp: '+919876543210',
      fullName: 'Amit Jain',
      tokenType: 'devotee',
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
  return { res, db }
}

test('user event self-registration creates registration and pledged transaction', async () => {
  const db = createDb()
  const { userRoutes, restore, getSaveCount } = loadRouteWithMocks(db)

  try {
    const handler = getRegisterHandler(userRoutes)
    const { res } = await invokeRoute(handler, {
      db,
      body: {
        seats: 3,
        notes: 'Family attending together',
      },
    })

    assert.equal(res.statusCode, 201)
    assert.equal(res.payload.registration.eventId, 'EVT-001')
    assert.equal(res.payload.registration.familyId, 'FAM-001')
    assert.equal(res.payload.registration.seats, 3)
    assert.equal(res.payload.registration.paymentStatus, 'Pending')
    assert.equal(res.payload.registration.approvalStatus, 'Pending Payment')
    assert.equal(res.payload.transaction.status, 'Pledged')
    assert.equal(res.payload.transaction.amount, 1500)
    assert.equal(db.eventRegistrations.length, 1)
    assert.equal(db.transactions.length, 1)
    assert.equal(db.eventRegistrations[0].transactionId, db.transactions[0].id)
    assert.equal(getSaveCount(), 1)
  } finally {
    restore()
  }
})

test('user event self-registration blocks duplicate family registration for same event', async () => {
  const db = createDb()
  db.eventRegistrations.push({
    id: 'REG-001',
    eventId: 'EVT-001',
    familyId: 'FAM-001',
    seats: 2,
    notes: '',
    registeredAt: '2026-04-01T00:00:00.000Z',
    checkedInAt: '',
    paymentStatus: 'Pending',
    approvalStatus: 'Pending Payment',
    transactionId: 'TRX-001',
    mandirId: 'MANDIR-001',
  })

  const { userRoutes, restore } = loadRouteWithMocks(db)
  try {
    const handler = getRegisterHandler(userRoutes)
    await assert.rejects(
      invokeRoute(handler, {
        db,
        body: {
          seats: 1,
        },
      }),
      (error) => {
        assert.equal(error.statusCode, 400)
        assert.match(String(error.message || ''), /already registered/i)
        return true
      },
    )
  } finally {
    restore()
  }
})
