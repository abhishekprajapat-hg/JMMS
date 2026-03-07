const { createId } = require('../utils/ids')
const { badRequest, notFound } = require('../utils/http')
const { ensureRequiredString, validateIndianWhatsApp } = require('../utils/validation')

const APPROVAL_TYPES = {
  CANCELLATION: 'CANCELLATION',
  FAMILY_UPDATE: 'FAMILY_UPDATE',
  EXPENSE: 'EXPENSE',
}

const APPROVAL_STATUS = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
}

function createApprovalRequest(db, { type, payload, requestedBy }) {
  if (!Object.values(APPROVAL_TYPES).includes(type)) {
    throw badRequest('Unsupported approval type.')
  }

  const request = {
    id: createId('APR'),
    type,
    status: APPROVAL_STATUS.PENDING,
    payload: payload || {},
    requestedBy: requestedBy?.username || '',
    requestedByName: requestedBy?.fullName || '',
    requestedByRole: requestedBy?.role || '',
    requestedAt: new Date().toISOString(),
    reviewedAt: '',
    reviewedBy: '',
    reviewedByName: '',
    reviewNote: '',
  }
  db.approvalRequests.unshift(request)
  return request
}

function applyCancellationApproval(db, request, reviewer) {
  const transactionId = ensureRequiredString(request.payload?.transactionId)
  const reason = ensureRequiredString(request.payload?.reason)
  if (!transactionId || !reason) {
    throw badRequest('Approval payload for cancellation is invalid.')
  }

  const transaction = db.transactions.find((item) => item.id === transactionId)
  if (!transaction) throw notFound('Transaction not found for approval.')
  if (transaction.cancelled) {
    throw badRequest('Transaction already cancelled.')
  }

  transaction.cancelled = true
  transaction.cancellationReason = reason
  transaction.cancellationAt = new Date().toISOString()

  const log = {
    id: createId('CAN'),
    transactionId: transaction.id,
    familyName: db.families.find((item) => item.familyId === transaction.familyId)?.headName || 'Anonymous',
    amount: transaction.amount,
    reason,
    actionBy: reviewer.fullName,
    createdAt: new Date().toISOString(),
  }
  db.cancellationLogs.unshift(log)
  return { transaction, cancellationLog: log }
}

function applyFamilyUpdateApproval(db, request) {
  const familyId = ensureRequiredString(request.payload?.familyId)
  if (!familyId) {
    throw badRequest('Approval payload for family update is invalid.')
  }

  const family = db.families.find((item) => item.familyId === familyId)
  if (!family) throw notFound('Family profile not found for approval.')

  const updates = {
    headName: ensureRequiredString(request.payload?.headName),
    gotra: ensureRequiredString(request.payload?.gotra),
    whatsapp: ensureRequiredString(request.payload?.whatsapp),
    address: ensureRequiredString(request.payload?.address),
  }

  if (!updates.headName || !updates.gotra || !updates.whatsapp || !updates.address) {
    throw badRequest('All family update fields are required.')
  }
  if (!validateIndianWhatsApp(updates.whatsapp)) {
    throw badRequest('Primary WhatsApp must be in +91XXXXXXXXXX format.')
  }
  if (
    updates.whatsapp !== family.whatsapp &&
    db.families.some((item) => item.familyId !== familyId && item.whatsapp === updates.whatsapp)
  ) {
    throw badRequest('A different family already uses this WhatsApp number.')
  }

  Object.assign(family, updates)
  return { family }
}

function applyExpenseApproval(db, request, reviewer) {
  const expenseId = ensureRequiredString(request.payload?.expenseId)
  if (!expenseId) {
    throw badRequest('Approval payload for expense is invalid.')
  }

  const expense = db.expenses.find((item) => item.id === expenseId)
  if (!expense) throw notFound('Expense not found for approval.')
  if (expense.status !== 'Pending Approval') {
    throw badRequest('Only pending expenses can be approved.')
  }

  expense.status = 'Approved'
  expense.approvedAt = new Date().toISOString()
  expense.approvedBy = reviewer.fullName
  return { expense }
}

function applyExpenseRejection(db, request, reviewer) {
  const expenseId = ensureRequiredString(request.payload?.expenseId)
  if (!expenseId) {
    throw badRequest('Approval payload for expense is invalid.')
  }

  const expense = db.expenses.find((item) => item.id === expenseId)
  if (!expense) throw notFound('Expense not found for rejection.')
  if (expense.status !== 'Pending Approval') {
    throw badRequest('Only pending expenses can be rejected.')
  }

  expense.status = 'Rejected'
  expense.approvedAt = new Date().toISOString()
  expense.approvedBy = reviewer.fullName
  return { expense }
}

function finalizeApproval(db, request, { decision, reviewer, reviewNote = '' }) {
  if (request.status !== APPROVAL_STATUS.PENDING) {
    throw badRequest('Approval request is already finalized.')
  }

  if (decision === APPROVAL_STATUS.REJECTED) {
    if (request.type === APPROVAL_TYPES.EXPENSE) {
      applyExpenseRejection(db, request, reviewer)
    }
    request.status = APPROVAL_STATUS.REJECTED
    request.reviewedAt = new Date().toISOString()
    request.reviewedBy = reviewer.username
    request.reviewedByName = reviewer.fullName
    request.reviewNote = ensureRequiredString(reviewNote)
    return { request, effects: {} }
  }

  if (decision !== APPROVAL_STATUS.APPROVED) {
    throw badRequest('Invalid approval decision.')
  }

  let effects = {}
  if (request.type === APPROVAL_TYPES.CANCELLATION) {
    effects = applyCancellationApproval(db, request, reviewer)
  } else if (request.type === APPROVAL_TYPES.FAMILY_UPDATE) {
    effects = applyFamilyUpdateApproval(db, request)
  } else if (request.type === APPROVAL_TYPES.EXPENSE) {
    effects = applyExpenseApproval(db, request, reviewer)
  } else {
    throw badRequest('Unsupported approval type.')
  }

  request.status = APPROVAL_STATUS.APPROVED
  request.reviewedAt = new Date().toISOString()
  request.reviewedBy = reviewer.username
  request.reviewedByName = reviewer.fullName
  request.reviewNote = ensureRequiredString(reviewNote)

  return { request, effects }
}

module.exports = {
  APPROVAL_TYPES,
  APPROVAL_STATUS,
  createApprovalRequest,
  finalizeApproval,
}
