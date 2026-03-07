const express = require('express')
const { getDb, saveDb } = require('../store/db')
const { authorize } = require('../middleware/authorize')
const { badRequest, notFound } = require('../utils/http')
const { validateIndianWhatsApp, ensureRequiredString } = require('../utils/validation')
const { APPROVAL_STATUS, APPROVAL_TYPES, createApprovalRequest } = require('../services/approvalService')
const { parseCsv, toCsv } = require('../utils/csv')

const router = express.Router()

function getNextFamilySequence(db) {
  const maxExisting = db.families.reduce((max, family) => {
    const numeric = Number(String(family.familyId || '').replace('FAM-', ''))
    if (!Number.isFinite(numeric)) return max
    return Math.max(max, numeric)
  }, 0)
  return maxExisting + 1
}

router.get('/', authorize('viewDevoteeDirectory'), (req, res) => {
  const db = getDb()
  res.json({ families: db.families })
})

router.post('/', authorize('manageDevotees'), async (req, res, next) => {
  try {
    const db = getDb()
    const headName = ensureRequiredString(req.body?.headName)
    const gotra = ensureRequiredString(req.body?.gotra)
    const whatsapp = ensureRequiredString(req.body?.whatsapp)
    const address = ensureRequiredString(req.body?.address)

    if (!headName || !gotra || !whatsapp || !address) {
      throw badRequest('Head of family, gotra, WhatsApp number, and address are required.')
    }
    if (!validateIndianWhatsApp(whatsapp)) {
      throw badRequest('Primary WhatsApp must be in +91XXXXXXXXXX format.')
    }

    if (db.families.some((family) => family.whatsapp === whatsapp)) {
      throw badRequest('A family with this WhatsApp number already exists.')
    }

    const familyId = `FAM-${String(getNextFamilySequence(db)).padStart(4, '0')}`
    const family = { familyId, headName, gotra, whatsapp, address }
    db.families.push(family)
    await saveDb()

    return res.status(201).json({ family })
  } catch (error) {
    return next(error)
  }
})

router.get('/export/csv', authorize('viewDevoteeDirectory'), (req, res) => {
  const db = getDb()
  const payload = toCsv(db.families, ['familyId', 'headName', 'gotra', 'whatsapp', 'address'])
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="families.csv"')
  res.send(payload)
})

router.post('/import/csv', authorize('manageDevotees'), async (req, res, next) => {
  try {
    const db = getDb()
    const csvData = String(req.body?.csvData || '')
    const mode = ensureRequiredString(req.body?.mode).toLowerCase() || 'append'
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

    let nextSequence = getNextFamilySequence(db)
    let created = 0
    let updated = 0
    let skipped = 0
    const errors = []

    for (const [index, row] of rows.entries()) {
      const familyIdInput = ensureRequiredString(row.familyId || row['Family ID'])
      const headName = ensureRequiredString(row.headName || row['Head of Family'] || row.name)
      const gotra = ensureRequiredString(row.gotra || row.Gotra)
      const whatsapp = ensureRequiredString(row.whatsapp || row['Primary WhatsApp'] || row.phone)
      const address = ensureRequiredString(row.address || row.Address)

      if (!headName || !gotra || !whatsapp || !address) {
        errors.push(`Row ${index + 2}: Missing required fields.`)
        skipped += 1
        continue
      }
      if (!validateIndianWhatsApp(whatsapp)) {
        errors.push(`Row ${index + 2}: Invalid WhatsApp format.`)
        skipped += 1
        continue
      }

      const byId = familyIdInput ? db.families.find((item) => item.familyId === familyIdInput) : null
      const byPhone = db.families.find((item) => item.whatsapp === whatsapp)

      if (mode === 'upsert' && (byId || byPhone)) {
        const target = byId || byPhone
        const duplicatePhone = db.families.some(
          (item) => item.familyId !== target.familyId && item.whatsapp === whatsapp,
        )
        if (duplicatePhone) {
          errors.push(`Row ${index + 2}: WhatsApp already used by another family.`)
          skipped += 1
          continue
        }

        Object.assign(target, {
          headName,
          gotra,
          whatsapp,
          address,
        })
        updated += 1
        continue
      }

      if (byId || byPhone) {
        skipped += 1
        continue
      }

      const familyId = familyIdInput || `FAM-${String(nextSequence).padStart(4, '0')}`
      if (!familyIdInput) nextSequence += 1

      db.families.push({
        familyId,
        headName,
        gotra,
        whatsapp,
        address,
      })
      created += 1
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

router.patch('/:familyId', authorize('manageDevotees'), async (req, res, next) => {
  try {
    const db = getDb()
    const { familyId } = req.params
    const family = db.families.find((item) => item.familyId === familyId)
    if (!family) {
      throw notFound('Family profile not found.')
    }

    const headName = ensureRequiredString(req.body?.headName)
    const gotra = ensureRequiredString(req.body?.gotra)
    const whatsapp = ensureRequiredString(req.body?.whatsapp)
    const address = ensureRequiredString(req.body?.address)

    if (!headName || !gotra || !whatsapp || !address) {
      throw badRequest('Head of family, gotra, WhatsApp number, and address are required.')
    }
    if (!validateIndianWhatsApp(whatsapp)) {
      throw badRequest('Primary WhatsApp must be in +91XXXXXXXXXX format.')
    }

    const duplicateWhatsapp = db.families.some(
      (item) => item.familyId !== familyId && ensureRequiredString(item.whatsapp) === whatsapp,
    )
    if (duplicateWhatsapp) {
      throw badRequest('A family with this WhatsApp number already exists.')
    }

    const isTrustee = req.user.role === 'trustee'
    if (!isTrustee) {
      const pending = db.approvalRequests.find(
        (item) =>
          item.status === APPROVAL_STATUS.PENDING &&
          item.type === APPROVAL_TYPES.FAMILY_UPDATE &&
          item.payload?.familyId === familyId,
      )
      if (pending) {
        throw badRequest(`A family update request is already pending (${pending.id}).`)
      }

      const approvalRequest = createApprovalRequest(db, {
        type: APPROVAL_TYPES.FAMILY_UPDATE,
        payload: {
          familyId,
          headName,
          gotra,
          whatsapp,
          address,
        },
        requestedBy: req.user,
      })
      await saveDb()
      return res.status(202).json({ approvalRequest })
    }

    Object.assign(family, {
      headName,
      gotra,
      whatsapp,
      address,
    })
    await saveDb()
    return res.json({ family })
  } catch (error) {
    return next(error)
  }
})

router.get('/:familyId', authorize('viewDevoteeDirectory'), (req, res, next) => {
  try {
    const db = getDb()
    const { familyId } = req.params
    const family = db.families.find((item) => item.familyId === familyId)
    if (!family) {
      throw notFound('Family profile not found.')
    }

    const donationHistory = db.transactions.filter((transaction) => transaction.familyId === familyId)
    const lifetimeContributions = donationHistory
      .filter((transaction) => transaction.status === 'Paid' && !transaction.cancelled)
      .reduce((sum, transaction) => sum + transaction.amount, 0)
    const pendingBoliAmount = donationHistory
      .filter((transaction) => transaction.status === 'Pledged' && !transaction.cancelled)
      .reduce((sum, transaction) => sum + transaction.amount, 0)

    res.json({
      family,
      donationHistory,
      summary: {
        lifetimeContributions,
        pendingBoliAmount,
      },
    })
  } catch (error) {
    next(error)
  }
})

module.exports = { familyRoutes: router }
