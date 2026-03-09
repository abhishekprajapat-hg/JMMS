const express = require('express')
const jwt = require('jsonwebtoken')
const { env } = require('../config/env')
const { authenticateDevotee } = require('../middleware/devoteeAuth')
const { getDb, saveDb } = require('../store/db')
const {
  PAYMENT_GATEWAYS,
  POOJA_SLOTS,
  TRANSACTION_TYPES,
  FUND_CATEGORIES,
} = require('../constants/domain')
const { badRequest, unauthorized } = require('../utils/http')
const { ensurePositiveNumber, ensureRequiredString, validateIndianWhatsApp } = require('../utils/validation')
const { createId } = require('../utils/ids')
const { hashPassword, verifyPassword } = require('../utils/passwords')
const {
  getPortalConfig,
  buildPaymentInstructions,
  buildFamilyPortalSummary,
} = require('../services/portalService')
const {
  resolveMandirId,
  scopeDbByMandir,
  getMandirProfile,
  getRecordMandirId,
  withMandir,
} = require('../services/tenantService')

const router = express.Router()

function issueDevoteeToken({ devoteeUser, affiliation }) {
  return jwt.sign(
    {
      sub: devoteeUser.id,
      familyId: affiliation.familyId,
      mandirId: affiliation.mandirId,
      whatsapp: ensureRequiredString(devoteeUser.whatsapp),
      fullName: ensureRequiredString(devoteeUser.fullName),
      tokenType: 'devotee',
    },
    env.jwtSecret,
    { expiresIn: env.devoteeJwtExpiresIn },
  )
}

function getNextFamilySequence(db) {
  const maxExisting = (db.families || []).reduce((max, family) => {
    const numeric = Number(String(family.familyId || '').replace('FAM-', ''))
    if (!Number.isFinite(numeric)) return max
    return Math.max(max, numeric)
  }, 0)
  return maxExisting + 1
}

function validateEmail(value) {
  const email = ensureRequiredString(value).toLowerCase()
  if (!email) return ''
  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  if (!isValid) {
    throw badRequest('Invalid email format.')
  }
  return email
}

function ensureIsoDate(value) {
  const date = ensureRequiredString(value)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw badRequest('date must be in YYYY-MM-DD format.')
  }
  return date
}

function findDevoteeUserByIdentifier(db, identifier) {
  const raw = ensureRequiredString(identifier)
  const query = raw.toLowerCase()
  if (!query) return { devoteeUser: null, affiliation: null }

  const byEmailOrPhone =
    (db.devoteeUsers || []).find((item) => {
      const email = ensureRequiredString(item.email).toLowerCase()
      const whatsapp = ensureRequiredString(item.whatsapp)
      return email === query || whatsapp === raw
    }) || null
  if (byEmailOrPhone) return { devoteeUser: byEmailOrPhone, affiliation: null }

  const familyAffiliation =
    (db.devoteeAffiliations || []).find(
      (item) => ensureRequiredString(item.familyId).toLowerCase() === query && item.status === 'active',
    ) || null
  if (!familyAffiliation) return { devoteeUser: null, affiliation: null }

  const devoteeUser =
    (db.devoteeUsers || []).find((item) => item.id === familyAffiliation.devoteeUserId) || null
  return { devoteeUser, affiliation: familyAffiliation }
}

function findOrCreateFamily(db, { mandirId, fullName, gotra, whatsapp, address }) {
  let family = (db.families || []).find(
    (item) => ensureRequiredString(item.whatsapp) === whatsapp && getRecordMandirId(item) === mandirId,
  )
  if (family) {
    family.headName = family.headName || fullName
    family.gotra = family.gotra || gotra
    family.address = family.address || address
    return family
  }

  const familyId = `FAM-${String(getNextFamilySequence(db)).padStart(4, '0')}`
  family = withMandir(
    {
      familyId,
      headName: fullName,
      gotra,
      whatsapp,
      address,
    },
    mandirId,
  )
  db.families.push(family)
  return family
}

function getPrimaryAffiliation(db, devoteeUserId) {
  const activeAffiliations = (db.devoteeAffiliations || []).filter(
    (item) => item.devoteeUserId === devoteeUserId && item.status === 'active',
  )
  if (!activeAffiliations.length) return null
  return activeAffiliations.find((item) => item.isPrimary) || activeAffiliations[0]
}

function ensureAffiliation(db, { devoteeUser, mandirId, familyId }) {
  let affiliation = (db.devoteeAffiliations || []).find(
    (item) =>
      item.devoteeUserId === devoteeUser.id &&
      item.mandirId === mandirId &&
      item.familyId === familyId &&
      item.status === 'active',
  )
  if (affiliation) return affiliation

  const existingPrimary = getPrimaryAffiliation(db, devoteeUser.id)
  affiliation = {
    id: createId('AFF'),
    devoteeUserId: devoteeUser.id,
    mandirId,
    familyId,
    isPrimary: !existingPrimary,
    joinedAt: new Date().toISOString(),
    status: 'active',
  }
  db.devoteeAffiliations.unshift(affiliation)
  return affiliation
}

function buildAuthResponse(db, { devoteeUser, affiliation }) {
  const scopedDb = scopeDbByMandir(db, affiliation.mandirId)
  const family = scopedDb.families.find((item) => item.familyId === affiliation.familyId)
  if (!family) {
    throw unauthorized('Linked family profile not found.')
  }

  const summary = buildFamilyPortalSummary(scopedDb, family.familyId)
  const token = issueDevoteeToken({ devoteeUser, affiliation })
  const affiliations = (db.devoteeAffiliations || [])
    .filter((item) => item.devoteeUserId === devoteeUser.id && item.status === 'active')
    .map((item) => ({
      id: item.id,
      mandirId: item.mandirId,
      familyId: item.familyId,
      isPrimary: Boolean(item.isPrimary),
      joinedAt: item.joinedAt,
    }))

  return {
    token,
    account: {
      id: devoteeUser.id,
      fullName: devoteeUser.fullName,
      email: devoteeUser.email || '',
      whatsapp: devoteeUser.whatsapp,
      activeMandirId: affiliation.mandirId,
      familyId: affiliation.familyId,
      affiliations,
    },
    family: {
      familyId: family.familyId,
      headName: family.headName,
      gotra: family.gotra,
      whatsapp: family.whatsapp,
    },
    summary,
    poojaSlots: POOJA_SLOTS,
    paymentGateways: PAYMENT_GATEWAYS,
    transactionTypes: TRANSACTION_TYPES,
    fundCategories: FUND_CATEGORIES,
    paymentPortal: getPortalConfig(scopedDb),
    mandirId: affiliation.mandirId,
    mandirProfile: getMandirProfile(db, affiliation.mandirId),
  }
}

function getAuthenticatedContext(db, req) {
  const devoteeUserId = ensureRequiredString(req.devotee?.sub)
  const tokenMandirId = ensureRequiredString(req.devotee?.mandirId)
  const tokenFamilyId = ensureRequiredString(req.devotee?.familyId)

  const devoteeUser = (db.devoteeUsers || []).find((item) => item.id === devoteeUserId)
  if (!devoteeUser || devoteeUser.status === 'blocked') {
    throw unauthorized('Devotee account not found for this token.')
  }

  const affiliation =
    (db.devoteeAffiliations || []).find(
      (item) =>
        item.devoteeUserId === devoteeUser.id &&
        item.mandirId === tokenMandirId &&
        item.familyId === tokenFamilyId &&
        item.status === 'active',
    ) || null
  if (!affiliation) {
    throw unauthorized('Devotee affiliation not found for this token.')
  }

  const family = (db.families || []).find(
    (item) => item.familyId === affiliation.familyId && getRecordMandirId(item) === affiliation.mandirId,
  )
  if (!family) {
    throw unauthorized('Family profile not found for this token.')
  }

  return {
    devoteeUser,
    affiliation,
    family,
    mandirId: affiliation.mandirId,
    scopedDb: scopeDbByMandir(db, affiliation.mandirId),
  }
}

router.post('/register', async (req, res, next) => {
  try {
    const db = getDb()
    const mandirId = resolveMandirId(req, db)
    const fullName = ensureRequiredString(req.body?.fullName)
    const gotra = ensureRequiredString(req.body?.gotra)
    const whatsapp = ensureRequiredString(req.body?.whatsapp)
    const address = ensureRequiredString(req.body?.address)
    const email = validateEmail(req.body?.email)
    const password = String(req.body?.password || '')

    if (!fullName || !gotra || !whatsapp || !address || !password) {
      throw badRequest('fullName, gotra, whatsapp, address, and password are required.')
    }
    if (password.length < 8) {
      throw badRequest('Password must be at least 8 characters.')
    }
    if (!validateIndianWhatsApp(whatsapp)) {
      throw badRequest('Primary WhatsApp must be in +91XXXXXXXXXX format.')
    }

    const existingByWhatsApp = (db.devoteeUsers || []).find(
      (item) => ensureRequiredString(item.whatsapp) === whatsapp,
    )
    const existingByEmail = email
      ? (db.devoteeUsers || []).find((item) => ensureRequiredString(item.email).toLowerCase() === email)
      : null
    const existingUser = existingByEmail || existingByWhatsApp || null

    const family = findOrCreateFamily(db, { mandirId, fullName, gotra, whatsapp, address })
    let devoteeUser = existingUser

    if (devoteeUser) {
      if (!verifyPassword(password, devoteeUser.passwordHash)) {
        throw badRequest('Account already exists. Use sign-in or correct password to join this mandir.')
      }
      devoteeUser.fullName = devoteeUser.fullName || fullName
      devoteeUser.email = devoteeUser.email || email
      devoteeUser.whatsapp = devoteeUser.whatsapp || whatsapp
    } else {
      devoteeUser = {
        id: createId('DVT'),
        familyId: family.familyId,
        mandirId,
        fullName,
        email,
        whatsapp,
        passwordHash: hashPassword(password),
        createdAt: new Date().toISOString(),
        lastLoginAt: '',
        status: 'active',
      }
      db.devoteeUsers.unshift(devoteeUser)
    }

    const affiliation = ensureAffiliation(db, {
      devoteeUser,
      mandirId,
      familyId: family.familyId,
    })
    devoteeUser.familyId = affiliation.familyId
    devoteeUser.mandirId = affiliation.mandirId
    devoteeUser.lastLoginAt = new Date().toISOString()

    await saveDb()
    return res.status(201).json(buildAuthResponse(db, { devoteeUser, affiliation }))
  } catch (error) {
    return next(error)
  }
})

router.post('/login', async (req, res, next) => {
  try {
    const db = getDb()
    const identifier = ensureRequiredString(req.body?.identifier)
    const password = String(req.body?.password || '')
    if (!identifier || !password) {
      throw badRequest('identifier and password are required.')
    }

    const { devoteeUser, affiliation: identifierAffiliation } = findDevoteeUserByIdentifier(db, identifier)
    if (!devoteeUser || devoteeUser.status === 'blocked') {
      throw unauthorized('Invalid credentials.')
    }
    if (!verifyPassword(password, devoteeUser.passwordHash)) {
      throw unauthorized('Invalid credentials.')
    }

    let selectedAffiliation = identifierAffiliation
    if (!selectedAffiliation) {
      selectedAffiliation = getPrimaryAffiliation(db, devoteeUser.id)
    }
    if (!selectedAffiliation) {
      throw unauthorized('No active mandir affiliation found for this account.')
    }

    devoteeUser.lastLoginAt = new Date().toISOString()
    devoteeUser.mandirId = selectedAffiliation.mandirId
    devoteeUser.familyId = selectedAffiliation.familyId
    await saveDb()
    return res.json(buildAuthResponse(db, { devoteeUser, affiliation: selectedAffiliation }))
  } catch (error) {
    return next(error)
  }
})

router.post('/session', async (req, res, next) => {
  try {
    const db = getDb()
    const mandirId = resolveMandirId(req, db)
    const familyId = ensureRequiredString(req.body?.familyId)
    const whatsapp = ensureRequiredString(req.body?.whatsapp)

    if (!familyId || !whatsapp) {
      throw badRequest('familyId and whatsapp are required.')
    }

    const family = (db.families || []).find(
      (item) =>
        item.familyId === familyId &&
        getRecordMandirId(item) === mandirId &&
        ensureRequiredString(item.whatsapp) === whatsapp,
    )
    if (!family) {
      throw badRequest('Family verification failed. Check family ID and WhatsApp number.')
    }

    const devoteeUser = (db.devoteeUsers || []).find(
      (item) => ensureRequiredString(item.whatsapp) === whatsapp && item.status === 'active',
    )
    if (!devoteeUser) {
      throw badRequest('No account is linked with this family. Please register first.')
    }

    const affiliation =
      (db.devoteeAffiliations || []).find(
        (item) =>
          item.devoteeUserId === devoteeUser.id &&
          item.familyId === familyId &&
          item.mandirId === mandirId &&
          item.status === 'active',
      ) || null
    if (!affiliation) {
      throw badRequest('This account is not linked with the selected mandir.')
    }

    devoteeUser.lastLoginAt = new Date().toISOString()
    devoteeUser.familyId = affiliation.familyId
    devoteeUser.mandirId = affiliation.mandirId
    await saveDb()

    return res.json(buildAuthResponse(db, { devoteeUser, affiliation }))
  } catch (error) {
    return next(error)
  }
})

router.use(authenticateDevotee)

router.get('/me', (req, res, next) => {
  try {
    const db = getDb()
    const context = getAuthenticatedContext(db, req)
    return res.json(
      buildAuthResponse(db, {
        devoteeUser: context.devoteeUser,
        affiliation: context.affiliation,
      }),
    )
  } catch (error) {
    return next(error)
  }
})

router.get('/bookings/availability', (req, res, next) => {
  try {
    const db = getDb()
    const context = getAuthenticatedContext(db, req)
    const requestedDate = ensureRequiredString(req.query?.date) || new Date().toISOString().slice(0, 10)
    const date = ensureIsoDate(requestedDate)

    const bookedSlots = Array.from(
      new Set(
        (db.poojaBookings || [])
          .filter(
            (booking) =>
              booking.date === date &&
              getRecordMandirId(booking) === context.mandirId &&
              POOJA_SLOTS.includes(booking.slot),
          )
          .map((booking) => booking.slot),
      ),
    )

    const availableSlots = POOJA_SLOTS.filter((slot) => !bookedSlots.includes(slot))

    return res.json({
      date,
      slots: POOJA_SLOTS,
      bookedSlots,
      availableSlots,
    })
  } catch (error) {
    return next(error)
  }
})

router.post('/bookings', async (req, res, next) => {
  try {
    const db = getDb()
    const context = getAuthenticatedContext(db, req)
    const date = ensureRequiredString(req.body?.date)
    const slot = ensureRequiredString(req.body?.slot)
    const notes = ensureRequiredString(req.body?.notes)

    if (!date || !slot) {
      throw badRequest('date and slot are required.')
    }
    if (!POOJA_SLOTS.includes(slot)) {
      throw badRequest('Invalid pooja slot.')
    }

    const conflict = (db.poojaBookings || []).find(
      (booking) =>
        booking.date === date &&
        booking.slot === slot &&
        getRecordMandirId(booking) === context.mandirId,
    )
    if (conflict) {
      throw badRequest('This pooja slot is already booked for the selected date.')
    }

    const booking = withMandir(
      {
        id: createId('POO'),
        date,
        slot,
        familyId: context.family.familyId,
        notes: notes || 'Booked from devotee website',
        overridden: false,
      },
      context.mandirId,
    )

    db.poojaBookings.unshift(booking)
    await saveDb()
    return res.status(201).json({ booking })
  } catch (error) {
    return next(error)
  }
})

router.post('/payments/intents', async (req, res, next) => {
  try {
    const db = getDb()
    const context = getAuthenticatedContext(db, req)
    const linkedTransactionId = ensureRequiredString(req.body?.linkedTransactionId)
    const gateway = ensureRequiredString(req.body?.gateway)
    const requestedTransactionType = ensureRequiredString(req.body?.transactionType)
    const requestedFundCategory = ensureRequiredString(req.body?.fundCategory)

    if (!PAYMENT_GATEWAYS.includes(gateway)) {
      throw badRequest('Invalid payment gateway.')
    }
    if (requestedTransactionType && !TRANSACTION_TYPES.includes(requestedTransactionType)) {
      throw badRequest('Invalid transaction type.')
    }
    if (requestedFundCategory && !FUND_CATEGORIES.includes(requestedFundCategory)) {
      throw badRequest('Invalid fund category.')
    }

    const linkedTransaction = linkedTransactionId
      ? (db.transactions || []).find(
          (transaction) =>
            transaction.id === linkedTransactionId &&
            transaction.familyId === context.family.familyId &&
            getRecordMandirId(transaction) === context.mandirId,
        )
      : null
    if (linkedTransactionId && !linkedTransaction) {
      throw badRequest('Linked transaction not found for this family.')
    }

    const requestedAmount = ensurePositiveNumber(req.body?.amount)
    const amount = requestedAmount || Number(linkedTransaction?.amount) || 0
    if (!amount) {
      throw badRequest('amount is required and must be positive.')
    }
    const transactionType = requestedTransactionType || 'Bhent'
    const fundCategory = requestedFundCategory || 'General Fund'

    const paymentIntent = withMandir(
      {
        id: createId('PAY'),
        familyId: context.family.familyId,
        linkedTransactionId: linkedTransactionId || '',
        amount,
        gateway,
        status: 'Pending',
        initiatedAt: new Date().toISOString(),
        reconciledAt: '',
        providerReference: '',
        failureReason: '',
        createdBy: context.family.headName,
        source: 'devotee_site',
        note: ensureRequiredString(req.body?.note) || 'Self-service payment intent',
        transactionType,
        fundCategory,
        payerUtr: '',
        payerName: '',
        proofSubmittedAt: '',
      },
      context.mandirId,
    )

    db.paymentIntents.unshift(paymentIntent)
    await saveDb()
    const instructions = await buildPaymentInstructions(context.scopedDb, paymentIntent)

    return res.status(201).json({
      paymentIntent,
      ...instructions,
    })
  } catch (error) {
    return next(error)
  }
})

router.post('/payments/:paymentId/proof', async (req, res, next) => {
  try {
    const db = getDb()
    const context = getAuthenticatedContext(db, req)
    const paymentIntent = (db.paymentIntents || []).find(
      (item) => item.id === req.params.paymentId && getRecordMandirId(item) === context.mandirId,
    )
    if (!paymentIntent) {
      throw badRequest('Payment intent not found.')
    }
    if (paymentIntent.familyId !== context.family.familyId) {
      throw badRequest('Family verification failed for proof submission.')
    }
    if (!['Pending', 'Proof Submitted'].includes(paymentIntent.status)) {
      throw badRequest('Proof can only be submitted for pending payment intents.')
    }

    const payerUtr = ensureRequiredString(req.body?.payerUtr)
    if (!payerUtr || payerUtr.length < 8) {
      throw badRequest('Valid payerUtr is required.')
    }

    paymentIntent.payerUtr = payerUtr
    paymentIntent.payerName = ensureRequiredString(req.body?.payerName)
    paymentIntent.proofSubmittedAt = new Date().toISOString()
    paymentIntent.status = 'Proof Submitted'
    await saveDb()

    return res.json({ paymentIntent })
  } catch (error) {
    return next(error)
  }
})

module.exports = { userRoutes: router }
