const test = require('node:test')
const assert = require('node:assert/strict')
const {
  APPROVAL_STATUS,
  APPROVAL_TYPES,
  createApprovalRequest,
  finalizeApproval,
} = require('../src/services/approvalService')

function createDb() {
  return {
    families: [
      {
        familyId: 'FAM-0001',
        headName: 'Amit Jain',
        gotra: 'Kashyap',
        whatsapp: '+919876543210',
        address: 'Jaipur',
      },
    ],
    transactions: [
      {
        id: 'TRX-1001',
        familyId: 'FAM-0001',
        amount: 5100,
        status: 'Paid',
        cancelled: false,
      },
    ],
    expenses: [
      {
        id: 'EXP-2001',
        title: 'Utility Bill',
        category: 'Utilities',
        amount: 3200,
        status: 'Pending Approval',
        approvedAt: '',
        approvedBy: '',
      },
    ],
    cancellationLogs: [],
    approvalRequests: [],
  }
}

test('finalizeApproval approves cancellation requests and writes cancellation log', () => {
  const db = createDb()
  const request = createApprovalRequest(db, {
    type: APPROVAL_TYPES.CANCELLATION,
    payload: { transactionId: 'TRX-1001', reason: 'Duplicate entry' },
    requestedBy: { username: 'admin', fullName: 'Admin User', role: 'admin' },
  })

  const reviewer = { username: 'trustee', fullName: 'Trustee User', role: 'trustee' }
  const result = finalizeApproval(db, request, {
    decision: APPROVAL_STATUS.APPROVED,
    reviewer,
    reviewNote: 'Approved',
  })

  assert.equal(result.request.status, APPROVAL_STATUS.APPROVED)
  assert.equal(db.transactions[0].cancelled, true)
  assert.equal(db.cancellationLogs.length, 1)
  assert.equal(db.cancellationLogs[0].transactionId, 'TRX-1001')
})

test('finalizeApproval approves family update requests', () => {
  const db = createDb()
  const request = createApprovalRequest(db, {
    type: APPROVAL_TYPES.FAMILY_UPDATE,
    payload: {
      familyId: 'FAM-0001',
      headName: 'Amit Kumar Jain',
      gotra: 'Kashyap',
      whatsapp: '+919876543210',
      address: 'Bapu Nagar, Jaipur',
    },
    requestedBy: { username: 'admin', fullName: 'Admin User', role: 'admin' },
  })

  const reviewer = { username: 'trustee', fullName: 'Trustee User', role: 'trustee' }
  finalizeApproval(db, request, {
    decision: APPROVAL_STATUS.APPROVED,
    reviewer,
  })

  assert.equal(db.families[0].headName, 'Amit Kumar Jain')
  assert.equal(db.families[0].address, 'Bapu Nagar, Jaipur')
})

test('finalizeApproval approves expense requests', () => {
  const db = createDb()
  const request = createApprovalRequest(db, {
    type: APPROVAL_TYPES.EXPENSE,
    payload: {
      expenseId: 'EXP-2001',
    },
    requestedBy: { username: 'admin', fullName: 'Admin User', role: 'admin' },
  })

  const reviewer = { username: 'trustee', fullName: 'Trustee User', role: 'trustee' }
  finalizeApproval(db, request, {
    decision: APPROVAL_STATUS.APPROVED,
    reviewer,
  })

  assert.equal(db.expenses[0].status, 'Approved')
  assert.equal(db.expenses[0].approvedBy, 'Trustee User')
})
