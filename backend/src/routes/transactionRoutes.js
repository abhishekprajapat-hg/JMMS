const express = require('express')
const { getDb, saveDb } = require('../store/db')
const { authorize, authorizeAny } = require('../middleware/authorize')
const { FUND_CATEGORIES, PAYMENT_STATUSES, TRANSACTION_TYPES } = require('../constants/domain')
const { badRequest, notFound } = require('../utils/http')
const { ensurePositiveNumber, ensureRequiredString } = require('../utils/validation')
const { createId } = require('../utils/ids')
const { generateReceiptPdf } = require('../services/receiptService')
const { sendWhatsAppTemplate } = require('../services/whatsappService')
const { APPROVAL_STATUS, APPROVAL_TYPES, createApprovalRequest } = require('../services/approvalService')
const { ensureReceiptMetadata } = require('../services/receiptTrustService')
const { parseCsv, toCsv } = require('../utils/csv')
const { resolveMandirId, filterByMandir, withMandir, getRecordMandirId } = require('../services/tenantService')

const router = express.Router()

function canBypass(req) {
  return req.user.role === 'trustee' && Boolean(req.body?.trusteeOverride)
}

function validateTransactionInput({ body, bypass }) {
  const type = ensureRequiredString(body.type)
  const fundCategory = ensureRequiredString(body.fundCategory)
  const status = ensureRequiredString(body.status)
  const amount = ensurePositiveNumber(body.amount)
  const familyId = ensureRequiredString(body.familyId)
  const dueDate = ensureRequiredString(body.dueDate)

  if (!TRANSACTION_TYPES.includes(type)) {
    throw badRequest('Invalid transaction type.')
  }
  if (!FUND_CATEGORIES.includes(fundCategory)) {
    throw badRequest('Invalid fund category.')
  }
  if (!PAYMENT_STATUSES.includes(status)) {
    throw badRequest('Invalid payment status.')
  }
  if (!amount) {
    throw badRequest('Donation amount must be a positive number.')
  }
  if (type !== 'Gupt Daan' && !familyId && !bypass) {
    throw badRequest('Family selection is required for Bhent and Boli transactions.')
  }
  if (status === 'Pledged' && !dueDate && !bypass) {
    throw badRequest('Pledged transaction requires due_date.')
  }
  if (status === 'Pledged' && type !== 'Boli' && !bypass) {
    throw badRequest('Only Boli transactions can be pledged.')
  }
  if (type === 'Gupt Daan' && status === 'Pledged' && !bypass) {
    throw badRequest('Gupt Daan cannot be pledged.')
  }

  return {
    type,
    fundCategory,
    status,
    amount,
    familyId: type === 'Gupt Daan' ? '' : familyId,
    dueDate: status === 'Pledged' ? dueDate : '',
  }
}

async function attachReceiptIfPaid({ db, transaction, munimName, mandirId }) {
  if (transaction.status !== 'Paid') return transaction
  ensureReceiptMetadata(db, transaction)

  const familyName =
    transaction.type === 'Gupt Daan'
      ? 'Anonymous (Gupt Daan)'
      : db.families.find(
          (item) => item.familyId === transaction.familyId && getRecordMandirId(item) === mandirId,
        )?.headName || 'Unknown'

  const receipt = await generateReceiptPdf({
    transaction,
    familyName,
    mandirProfile: db.mandirProfile,
    munimName,
    verificationUrl: transaction.receiptVerificationUrl || '',
  })

  return {
    ...transaction,
    ...receipt,
    receiptGeneratedBy: munimName,
  }
}

router.get('/', authorizeAny(['logDonations', 'viewFinancialTotals']), (req, res) => {
  const db = getDb()
  const mandirId = resolveMandirId(req, db)
  res.json({
    transactions: filterByMandir(db.transactions, mandirId),
  })
})

router.get('/export/csv', authorizeAny(['logDonations', 'viewFinancialTotals']), (req, res) => {
  const db = getDb()
  const mandirId = resolveMandirId(req, db)
  const payload = toCsv(filterByMandir(db.transactions, mandirId), [
    'id',
    'familyId',
    'type',
    'fundCategory',
    'status',
    'amount',
    'dueDate',
    'createdAt',
    'paidAt',
    'cancelled',
    'cancellationReason',
    'cancellationAt',
    'receiptNumber',
    'receiptPath',
  ])
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"')
  res.send(payload)
})

router.post('/import/csv', authorize('logDonations'), async (req, res, next) => {
  try {
    const db = getDb()
    const mandirId = resolveMandirId(req, db)
    const tenantFamilies = filterByMandir(db.families, mandirId)
    const tenantTransactions = filterByMandir(db.transactions, mandirId)
    const csvData = String(req.body?.csvData || '')
    const mode = ensureRequiredString(req.body?.mode).toLowerCase() || 'append'
    const munimName = ensureRequiredString(req.body?.munimName) || req.user.fullName
    const bypass = canBypass(req)

    if (!csvData.trim()) {
      throw badRequest('csvData is required.')
    }
    if (!['append', 'upsert'].includes(mode)) {
      throw badRequest('mode must be append or upsert.')
    }

    const rows = parseCsv(csvData)
    if (!rows.length) {
      throw badRequest('CSV has no data rows.')
    }

    let created = 0
    let updated = 0
    let skipped = 0
    const errors = []

    for (const [index, row] of rows.entries()) {
      try {
        const rowPayload = validateTransactionInput({
          body: {
            familyId: ensureRequiredString(row.familyId || row['Family ID']),
            type: ensureRequiredString(row.type || row.Type),
            fundCategory: ensureRequiredString(row.fundCategory || row['Fund Category']),
            status: ensureRequiredString(row.status || row.Status),
            amount: row.amount || row.Amount,
            dueDate: ensureRequiredString(row.dueDate || row['Due Date']),
          },
          bypass,
        })

        if (
          rowPayload.familyId &&
          !tenantFamilies.some((family) => family.familyId === rowPayload.familyId) &&
          !bypass
        ) {
          throw badRequest('Selected family does not exist.')
        }

        const providedId = ensureRequiredString(row.id || row.transactionId || row['Transaction ID'])
        const existing = providedId
          ? tenantTransactions.find((item) => item.id === providedId)
          : null

        if (existing && mode !== 'upsert') {
          skipped += 1
          continue
        }

        const baseTransaction = withMandir({
          id: providedId || createId('TRX'),
          ...rowPayload,
          createdAt: ensureRequiredString(row.createdAt) || new Date().toISOString(),
          paidAt:
            rowPayload.status === 'Paid'
              ? ensureRequiredString(row.paidAt) || new Date().toISOString()
              : '',
          cancelled: String(row.cancelled || '').toLowerCase() === 'true',
          cancellationReason: ensureRequiredString(row.cancellationReason),
          cancellationAt: ensureRequiredString(row.cancellationAt),
          receiptPath: ensureRequiredString(row.receiptPath),
          receiptFileName: ensureRequiredString(row.receiptFileName),
          receiptGeneratedBy: ensureRequiredString(row.receiptGeneratedBy) || '',
          receiptNumber: ensureRequiredString(row.receiptNumber),
          receiptIssuedAt: ensureRequiredString(row.receiptIssuedAt),
          receiptVerificationHash: ensureRequiredString(row.receiptVerificationHash),
          receiptVerificationUrl: ensureRequiredString(row.receiptVerificationUrl),
        }, mandirId)

        const normalized = await attachReceiptIfPaid({
          db,
          transaction: baseTransaction,
          munimName,
          mandirId,
        })

        if (existing) {
          Object.assign(existing, normalized)
          updated += 1
        } else {
          db.transactions.unshift(normalized)
          tenantTransactions.unshift(normalized)
          created += 1
        }
      } catch (rowError) {
        errors.push(`Row ${index + 2}: ${rowError.message}`)
        skipped += 1
      }
    }

    if (created || updated) {
      await saveDb()
    }

    return res.json({
      totalRows: rows.length,
      created,
      updated,
      skipped,
      errors,
    })
  } catch (error) {
    return next(error)
  }
})

router.post('/', authorize('logDonations'), async (req, res, next) => {
  try {
    const db = getDb()
    const mandirId = resolveMandirId(req, db)
    const tenantFamilies = filterByMandir(db.families, mandirId)
    const bypass = canBypass(req)
    const munimName = ensureRequiredString(req.body?.munimName) || req.user.fullName
    const payload = validateTransactionInput({ body: req.body || {}, bypass })

    if (payload.familyId && !tenantFamilies.some((family) => family.familyId === payload.familyId) && !bypass) {
      throw badRequest('Selected family does not exist.')
    }

    const transaction = await attachReceiptIfPaid({
      db,
      transaction: withMandir({
        id: createId('TRX'),
        ...payload,
        createdAt: new Date().toISOString(),
        paidAt: payload.status === 'Paid' ? new Date().toISOString() : '',
        cancelled: false,
        cancellationReason: '',
        cancellationAt: '',
        receiptPath: '',
        receiptFileName: '',
        receiptGeneratedBy: '',
      }, mandirId),
      munimName,
      mandirId,
    })

    db.transactions.unshift(transaction)
    await saveDb()

    let whatsappLog = null
    if (transaction.status === 'Paid') {
      whatsappLog = await sendWhatsAppTemplate({
        transaction,
        templateType: 'instant_receipt',
        trigger: 'status_paid',
        initiatedBy: req.user.username,
      })
    }

    return res.status(201).json({ transaction, whatsappLog })
  } catch (error) {
    return next(error)
  }
})

router.patch('/:transactionId/status', authorize('logDonations'), async (req, res, next) => {
  try {
    const db = getDb()
    const mandirId = resolveMandirId(req, db)
    const { transactionId } = req.params
    const nextStatus = ensureRequiredString(req.body?.status)
    const munimName = ensureRequiredString(req.body?.munimName) || req.user.fullName
    const bypass = canBypass(req)
    const transaction = db.transactions.find(
      (item) => item.id === transactionId && getRecordMandirId(item) === mandirId,
    )
    if (!transaction) throw notFound('Transaction not found.')
    if (nextStatus !== 'Paid' && !bypass) {
      throw badRequest('Only transition allowed is Pledged -> Paid.')
    }
    if (transaction.status !== 'Pledged' && !bypass) {
      throw badRequest('Only pledged transactions can be marked as paid.')
    }

    transaction.status = 'Paid'
    transaction.dueDate = ''
    transaction.paidAt = new Date().toISOString()

    const withReceipt = await attachReceiptIfPaid({
      db,
      transaction,
      munimName,
      mandirId,
    })
    Object.assign(transaction, withReceipt)

    await saveDb()
    const whatsappLog = await sendWhatsAppTemplate({
      transaction,
      templateType: 'instant_receipt',
      trigger: 'status_paid',
      initiatedBy: req.user.username,
    })

    return res.json({ transaction, whatsappLog })
  } catch (error) {
    return next(error)
  }
})

router.post('/:transactionId/cancel', authorize('cancelOrRefund'), async (req, res, next) => {
  try {
    const db = getDb()
    const mandirId = resolveMandirId(req, db)
    const { transactionId } = req.params
    const reason = ensureRequiredString(req.body?.reason)
    const bypass = canBypass(req)
    const transaction = db.transactions.find(
      (item) => item.id === transactionId && getRecordMandirId(item) === mandirId,
    )
    if (!transaction) throw notFound('Transaction not found.')

    if (!reason) {
      throw badRequest('Cancellation/refund reason is required.')
    }
    if (!transaction.receiptPath && !bypass) {
      throw badRequest('Only receipted transactions can be formally cancelled/refunded.')
    }
    if (transaction.cancelled && !bypass) {
      throw badRequest('Transaction already has an active cancellation record.')
    }

    const isTrustee = req.user.role === 'trustee'
    if (!isTrustee && !bypass) {
      const pending = db.approvalRequests.find(
        (item) =>
          item.status === APPROVAL_STATUS.PENDING &&
          item.type === APPROVAL_TYPES.CANCELLATION &&
          item.payload?.transactionId === transaction.id &&
          ensureRequiredString(item.payload?.mandirId) === mandirId,
      )
      if (pending) {
        throw badRequest(`Cancellation request is already pending approval (${pending.id}).`)
      }

      const approvalRequest = createApprovalRequest(db, {
        type: APPROVAL_TYPES.CANCELLATION,
        payload: {
          transactionId: transaction.id,
          mandirId,
          reason,
        },
        requestedBy: req.user,
      })
      await saveDb()
      return res.status(202).json({ approvalRequest })
    }

    transaction.cancelled = true
    transaction.cancellationReason = reason
    transaction.cancellationAt = new Date().toISOString()

    const log = {
      id: createId('CAN'),
      transactionId: transaction.id,
      familyName:
        db.families.find(
          (item) => item.familyId === transaction.familyId && getRecordMandirId(item) === mandirId,
        )?.headName || 'Anonymous',
      amount: transaction.amount,
      reason,
      actionBy: req.user.fullName,
      createdAt: new Date().toISOString(),
      mandirId,
    }
    db.cancellationLogs.unshift(log)
    await saveDb()

    return res.status(201).json({ cancellationLog: log })
  } catch (error) {
    return next(error)
  }
})

router.get('/cancellations/logs', authorize('cancelOrRefund'), (req, res) => {
  const db = getDb()
  const mandirId = resolveMandirId(req, db)
  res.json({ cancellationLogs: filterByMandir(db.cancellationLogs, mandirId) })
})

module.exports = { transactionRoutes: router }
