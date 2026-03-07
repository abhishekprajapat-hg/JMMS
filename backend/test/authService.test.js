const test = require('node:test')
const assert = require('node:assert/strict')
const jwt = require('jsonwebtoken')
const { verifyLogin, issueTokenPair, findRefreshRecord, revokeRefreshToken } = require('../src/services/authService')
const { env } = require('../src/config/env')

function createDb() {
  return {
    users: [
      {
        id: 'USR-1',
        username: 'trustee',
        password: 'trustee123',
        role: 'trustee',
        fullName: 'Trustee One',
      },
    ],
    auth: {
      refreshTokens: [],
    },
  }
}

test('verifyLogin migrates legacy plaintext password to passwordHash', () => {
  const db = createDb()
  const result = verifyLogin(db, 'trustee', 'trustee123')
  assert.equal(result.ok, true)
  assert.equal(Boolean(result.user.passwordHash), true)
  assert.equal('password' in result.user, false)
})

test('issueTokenPair stores refresh token record and can revoke it', () => {
  const db = createDb()
  const verification = verifyLogin(db, 'trustee', 'trustee123')
  assert.equal(verification.ok, true)

  const pair = issueTokenPair(db, verification.user, { ip: '127.0.0.1', userAgent: 'test-agent' })
  assert.ok(pair.accessToken)
  assert.ok(pair.refreshToken)
  assert.equal(db.auth.refreshTokens.length, 1)

  const payload = jwt.verify(pair.refreshToken, env.jwtRefreshSecret)
  assert.equal(payload.tokenType, 'refresh')
  assert.equal(payload.sub, verification.user.id)

  const record = findRefreshRecord(db, pair.refreshToken)
  assert.ok(record)
  assert.equal(record.revokedAt, '')

  revokeRefreshToken(db, pair.refreshToken)
  assert.notEqual(record.revokedAt, '')
})
