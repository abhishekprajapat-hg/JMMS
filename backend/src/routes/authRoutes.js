const express = require('express')
const { getDb, saveDb } = require('../store/db')
const { authenticate } = require('../middleware/auth')
const { badRequest, unauthorized, tooManyRequests } = require('../utils/http')
const { getThrottleState, registerFailure, registerSuccess } = require('../services/loginThrottleService')
const {
  sanitizeUser,
  verifyLogin,
  issueTokenPair,
  verifyRefreshToken,
  findRefreshRecord,
  revokeRefreshToken,
} = require('../services/authService')

const router = express.Router()

function getClientIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)[0]
  return forwarded || req.ip || req.socket?.remoteAddress || 'unknown'
}

router.post('/login', async (req, res, next) => {
  try {
    const username = String(req.body?.username || '').trim()
    const password = String(req.body?.password || '')
    if (!username || !password) {
      throw badRequest('Username and password are required.')
    }

    const clientIp = getClientIp(req)
    const throttle = getThrottleState(username, clientIp)
    if (throttle.blocked) {
      throw tooManyRequests(`Too many failed login attempts. Try again in ${throttle.retryAfterSeconds}s.`)
    }

    const db = getDb()
    const verification = verifyLogin(db, username, password)
    if (!verification.ok || !verification.user) {
      registerFailure(username, clientIp)
      if (verification.migrated) {
        await saveDb()
      }
      throw unauthorized('Invalid credentials.')
    }
    const user = verification.user

    registerSuccess(username, clientIp)

    const tokenPair = issueTokenPair(db, user, {
      ip: clientIp,
      userAgent: String(req.headers['user-agent'] || ''),
    })
    await saveDb()

    return res.json({
      token: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      user: sanitizeUser(user),
    })
  } catch (error) {
    return next(error)
  }
})

router.post('/refresh', async (req, res, next) => {
  try {
    const rawRefreshToken = String(req.body?.refreshToken || '').trim()
    if (!rawRefreshToken) {
      throw badRequest('refreshToken is required.')
    }

    const db = getDb()
    const payload = verifyRefreshToken(rawRefreshToken)
    if (payload.tokenType !== 'refresh') {
      throw unauthorized('Invalid refresh token type.')
    }

    const record = findRefreshRecord(db, rawRefreshToken)
    if (!record || record.revokedAt) {
      throw unauthorized('Refresh token is no longer valid.')
    }

    if (record.jti !== payload.jti || record.userId !== payload.sub) {
      throw unauthorized('Refresh token record mismatch.')
    }

    const expiresAtMs = Date.parse(record.expiresAt || '')
    if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
      throw unauthorized('Refresh token has expired.')
    }

    const user = db.users.find((item) => item.id === payload.sub)
    if (!user) {
      throw unauthorized('User account not found for refresh token.')
    }

    const clientIp = getClientIp(req)
    const nextPair = issueTokenPair(db, user, {
      ip: clientIp,
      userAgent: String(req.headers['user-agent'] || ''),
      parentJti: record.jti,
    })
    revokeRefreshToken(db, rawRefreshToken, nextPair.jti)
    await saveDb()

    return res.json({
      token: nextPair.accessToken,
      refreshToken: nextPair.refreshToken,
      user: sanitizeUser(user),
    })
  } catch (error) {
    if (error.statusCode) {
      return next(error)
    }
    return next(unauthorized(error.message || 'Refresh token validation failed.'))
  }
})

router.post('/logout', async (req, res, next) => {
  try {
    const rawRefreshToken = String(req.body?.refreshToken || '').trim()
    if (!rawRefreshToken) {
      throw badRequest('refreshToken is required.')
    }
    const db = getDb()
    revokeRefreshToken(db, rawRefreshToken)
    await saveDb()
    return res.json({ ok: true })
  } catch (error) {
    return next(error)
  }
})

router.get('/me', authenticate, (req, res) => {
  res.json({
    user: sanitizeUser({
      id: req.user.sub,
      username: req.user.username,
      role: req.user.role,
      fullName: req.user.fullName,
    }),
  })
})

module.exports = { authRoutes: router }
