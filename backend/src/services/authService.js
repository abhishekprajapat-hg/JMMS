const crypto = require('node:crypto')
const jwt = require('jsonwebtoken')
const { env } = require('../config/env')
const { getPermissionsForRole } = require('../constants/rbac')
const { hashPassword, isPasswordHash, verifyPassword } = require('../utils/passwords')

function hashToken(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex')
}

function sanitizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    fullName: user.fullName,
    mandirId: user.mandirId || '',
    permissions: getPermissionsForRole(user.role),
  }
}

function pruneRefreshTokens(db) {
  const now = Date.now()
  db.auth.refreshTokens = db.auth.refreshTokens.filter((entry) => {
    if (!entry || typeof entry !== 'object') return false
    if (entry.revokedAt) return false
    const expiry = Date.parse(entry.expiresAt || '')
    return Number.isFinite(expiry) && expiry > now
  })
}

function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      username: user.username,
      role: user.role,
      fullName: user.fullName,
      mandirId: user.mandirId || '',
      tokenType: 'access',
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn },
  )
}

function signRefreshToken(user, jti) {
  return jwt.sign(
    {
      sub: user.id,
      username: user.username,
      role: user.role,
      tokenType: 'refresh',
      jti,
    },
    env.jwtRefreshSecret,
    { expiresIn: env.jwtRefreshExpiresIn },
  )
}

function migrateLegacyPasswordIfNeeded(user) {
  const plain = typeof user.password === 'string' ? user.password : ''
  if (isPasswordHash(user.passwordHash)) return false
  if (!plain) return false
  user.passwordHash = hashPassword(plain)
  delete user.password
  user.passwordMigratedAt = new Date().toISOString()
  return true
}

function verifyLogin(db, username, password) {
  const user = db.users.find((item) => item.username === username)
  if (!user) return { ok: false, user: null, migrated: false }

  let migrated = false
  if (!isPasswordHash(user.passwordHash) && typeof user.password === 'string') {
    migrated = migrateLegacyPasswordIfNeeded(user)
  }

  const hashValid = isPasswordHash(user.passwordHash) && verifyPassword(password, user.passwordHash)
  if (hashValid) {
    return { ok: true, user, migrated }
  }

  const legacyValid = typeof user.password === 'string' && user.password === password
  if (!legacyValid) {
    return { ok: false, user: null, migrated }
  }

  user.passwordHash = hashPassword(password)
  delete user.password
  user.passwordMigratedAt = new Date().toISOString()
  return { ok: true, user, migrated: true }
}

function issueTokenPair(db, user, { ip = '', userAgent = '', parentJti = '' } = {}) {
  pruneRefreshTokens(db)

  const jti = crypto.randomUUID()
  const accessToken = signAccessToken(user)
  const refreshToken = signRefreshToken(user, jti)
  const decoded = jwt.decode(refreshToken) || {}
  const expiresAt = decoded.exp ? new Date(decoded.exp * 1000).toISOString() : ''

  db.auth.refreshTokens.unshift({
    jti,
    userId: user.id,
    username: user.username,
    tokenHash: hashToken(refreshToken),
    issuedAt: new Date().toISOString(),
    expiresAt,
    revokedAt: '',
    replacedBy: '',
    parentJti: parentJti || '',
    ip,
    userAgent,
  })

  return { accessToken, refreshToken, jti }
}

function revokeRefreshToken(db, rawToken, replacementJti = '') {
  const tokenHash = hashToken(rawToken)
  const record = db.auth.refreshTokens.find((item) => item.tokenHash === tokenHash && !item.revokedAt)
  if (!record) return null
  record.revokedAt = new Date().toISOString()
  if (replacementJti) {
    record.replacedBy = replacementJti
  }
  return record
}

function findRefreshRecord(db, rawToken) {
  const tokenHash = hashToken(rawToken)
  return db.auth.refreshTokens.find((item) => item.tokenHash === tokenHash) || null
}

function verifyRefreshToken(rawToken) {
  return jwt.verify(rawToken, env.jwtRefreshSecret)
}

module.exports = {
  sanitizeUser,
  migrateLegacyPasswordIfNeeded,
  verifyLogin,
  issueTokenPair,
  verifyRefreshToken,
  revokeRefreshToken,
  findRefreshRecord,
  pruneRefreshTokens,
}
