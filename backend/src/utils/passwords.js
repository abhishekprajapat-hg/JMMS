const crypto = require('node:crypto')

const SCRYPT_N = 16384
const SCRYPT_R = 8
const SCRYPT_P = 1
const KEY_LEN = 64

function isPasswordHash(value) {
  return typeof value === 'string' && value.startsWith('scrypt$')
}

function hashPassword(plainText) {
  const password = String(plainText || '')
  const salt = crypto.randomBytes(16).toString('hex')
  const derived = crypto.scryptSync(password, salt, KEY_LEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  })
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt}$${derived.toString('hex')}`
}

function verifyPassword(plainText, storedHash) {
  if (!isPasswordHash(storedHash)) return false
  const [scheme, n, r, p, salt, expectedHex] = storedHash.split('$')
  if (scheme !== 'scrypt' || !n || !r || !p || !salt || !expectedHex) return false
  const expected = Buffer.from(expectedHex, 'hex')
  const derived = crypto.scryptSync(String(plainText || ''), salt, expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  })
  return crypto.timingSafeEqual(expected, derived)
}

module.exports = {
  isPasswordHash,
  hashPassword,
  verifyPassword,
}
