const express = require('express')
const { getDb, saveDb } = require('../store/db')
const { authorize, authorizeAny } = require('../middleware/authorize')
const { EXPENSE_CATEGORIES } = require('../constants/domain')
const { badRequest, notFound } = require('../utils/http')
const { ensurePositiveNumber, ensureRequiredString } = require('../utils/validation')
const { createId } = require('../utils/ids')
const { APPROVAL_TYPES, createApprovalRequest } = require('../services/approvalService')

const router = express.Router()

router.get('/', authorizeAny(['manageExpenses', 'viewAccounting']), (req, res) => {
  const db = getDb()
  const expenses = [...(db.expenses || [])].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
  res.json({
    expenses,
    categories: EXPENSE_CATEGORIES,
  })
})

router.post('/', authorize('manageExpenses'), async (req, res, next) => {
  try {
    const db = getDb()
    const title = ensureRequiredString(req.body?.title)
    const category = ensureRequiredString(req.body?.category)
    const expenseDate = ensureRequiredString(req.body?.expenseDate)
    const paymentMode = ensureRequiredString(req.body?.paymentMode)
    const vendor = ensureRequiredString(req.body?.vendor)
    const notes = ensureRequiredString(req.body?.notes)
    const amount = ensurePositiveNumber(req.body?.amount)

    if (!title || !category || !expenseDate || !paymentMode) {
      throw badRequest('title, category, expenseDate, and paymentMode are required.')
    }
    if (!EXPENSE_CATEGORIES.includes(category)) {
      throw badRequest('Invalid expense category.')
    }
    if (!amount) {
      throw badRequest('Expense amount must be a positive number.')
    }

    const expense = {
      id: createId('EXP'),
      title,
      category,
      amount,
      expenseDate,
      paymentMode,
      vendor,
      notes,
      status: req.user.role === 'trustee' ? 'Approved' : 'Pending Approval',
      createdAt: new Date().toISOString(),
      createdBy: req.user.fullName,
      approvedAt: req.user.role === 'trustee' ? new Date().toISOString() : '',
      approvedBy: req.user.role === 'trustee' ? req.user.fullName : '',
      paidAt: '',
    }

    db.expenses.unshift(expense)

    if (req.user.role !== 'trustee') {
      const approvalRequest = createApprovalRequest(db, {
        type: APPROVAL_TYPES.EXPENSE,
        payload: {
          expenseId: expense.id,
        },
        requestedBy: req.user,
      })
      await saveDb()
      return res.status(202).json({ expense, approvalRequest })
    }

    await saveDb()
    return res.status(201).json({ expense })
  } catch (error) {
    return next(error)
  }
})

router.post('/:expenseId/pay', authorize('manageExpenses'), async (req, res, next) => {
  try {
    const db = getDb()
    const expense = db.expenses.find((item) => item.id === req.params.expenseId)
    if (!expense) throw notFound('Expense not found.')

    if (expense.status !== 'Approved') {
      throw badRequest('Only approved expenses can be marked as paid.')
    }

    expense.status = 'Paid'
    expense.paidAt = new Date().toISOString()

    await saveDb()
    return res.json({ expense })
  } catch (error) {
    return next(error)
  }
})

module.exports = { expenseRoutes: router }
