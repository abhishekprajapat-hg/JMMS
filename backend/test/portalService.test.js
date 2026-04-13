const test = require('node:test')
const assert = require('node:assert/strict')
const { buildFamilyPortalSummary } = require('../src/services/portalService')

test('buildFamilyPortalSummary includes event catalog and enriched registrations', () => {
  const db = {
    families: [
      {
        familyId: 'FAM-0001',
        headName: 'Shah Family',
        gotra: 'Kashyap',
      },
    ],
    transactions: [
      {
        id: 'TRX-1001',
        familyId: 'FAM-0001',
        amount: 5000,
        status: 'Pledged',
        cancelled: false,
        dueDate: '2026-05-20',
      },
    ],
    poojaBookings: [],
    events: [
      {
        id: 'EVT-1',
        name: 'Paryushan Sabha',
        date: '2026-05-20',
        hall: 'Main Hall',
        capacity: 100,
        feePerFamily: 2500,
      },
    ],
    eventRegistrations: [
      {
        id: 'REG-1',
        eventId: 'EVT-1',
        familyId: 'FAM-0001',
        seats: 2,
        paymentStatus: 'Pending',
        transactionId: 'TRX-1001',
      },
    ],
    paymentIntents: [
      {
        id: 'PAY-1',
        familyId: 'FAM-0001',
        linkedTransactionId: 'TRX-1001',
        status: 'Pending',
        initiatedAt: '2026-05-18T10:00:00.000Z',
      },
    ],
  }

  const summary = buildFamilyPortalSummary(db, 'FAM-0001')

  assert.ok(summary)
  assert.equal(summary.events.length, 1)
  assert.equal(summary.events[0].isFamilyRegistered, true)
  assert.equal(summary.eventRegistrations.length, 1)
  assert.equal(summary.eventRegistrations[0].eventName, 'Paryushan Sabha')
  assert.equal(summary.eventRegistrations[0].canPayNow, true)
  assert.equal(summary.eventRegistrations[0].paymentStatus, 'Pending')
  assert.equal(summary.eventRegistrations[0].approvalStatus, 'Pending Payment')
  assert.equal(summary.eventRegistrations[0].linkedTransaction.id, 'TRX-1001')
  assert.equal(summary.eventRegistrations[0].latestPaymentIntent.id, 'PAY-1')
})
