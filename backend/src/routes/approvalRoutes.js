const express = require('express')
const { authorize, authorizeAny } = require('../middleware/authorize')
const { getDb, saveDb } = require('../store/db')
const { ensureRequiredString } = require('../utils/validation')
const { notFound } = require('../utils/http')
const { APPROVAL_STATUS, finalizeApproval } = require('../services/approvalService')
const { getPermissionsForRole } = require('../constants/rbac')

const router = express.Router()

router.get('/', authorizeAny(['approveSensitiveActions', 'cancelOrRefund', 'manageDevotees', 'manageExpenses']), (req, res) => {
  const db = getDb()
  const statusFilter = ensureRequiredString(req.query?.status)
  const typeFilter = ensureRequiredString(req.query?.type)
  const permissions = getPermissionsForRole(req.user.role)

  let approvals = db.approvalRequests
  if (statusFilter) {
    approvals = approvals.filter((item) => item.status === statusFilter)
  }
  if (typeFilter) {
    approvals = approvals.filter((item) => item.type === typeFilter)
  }

  if (!permissions.approveSensitiveActions) {
    approvals = approvals.filter((item) => item.requestedBy === req.user.username)
  }

  res.json({ approvals })
})

router.post('/:approvalId/approve', authorize('approveSensitiveActions'), async (req, res, next) => {
  try {
    const db = getDb()
    const approval = db.approvalRequests.find((item) => item.id === req.params.approvalId)
    if (!approval) throw notFound('Approval request not found.')

    const { request, effects } = finalizeApproval(db, approval, {
      decision: APPROVAL_STATUS.APPROVED,
      reviewer: req.user,
      reviewNote: req.body?.note || '',
    })
    await saveDb()
    return res.json({ approval: request, effects })
  } catch (error) {
    return next(error)
  }
})

router.post('/:approvalId/reject', authorize('approveSensitiveActions'), async (req, res, next) => {
  try {
    const db = getDb()
    const approval = db.approvalRequests.find((item) => item.id === req.params.approvalId)
    if (!approval) throw notFound('Approval request not found.')

    const { request } = finalizeApproval(db, approval, {
      decision: APPROVAL_STATUS.REJECTED,
      reviewer: req.user,
      reviewNote: req.body?.note || '',
    })
    await saveDb()
    return res.json({ approval: request })
  } catch (error) {
    return next(error)
  }
})

module.exports = { approvalRoutes: router }
