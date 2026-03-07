const WINDOW_MS = 15 * 60 * 1000
const LOCKOUT_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 5

const attemptsByKey = new Map()

function nowMs() {
  return Date.now()
}

function toKey(username, ip) {
  return `${String(username || '').trim().toLowerCase()}::${String(ip || '').trim()}`
}

function getRecord(key) {
  const existing = attemptsByKey.get(key)
  if (!existing) {
    const initial = {
      attempts: [],
      lockedUntil: 0,
    }
    attemptsByKey.set(key, initial)
    return initial
  }
  return existing
}

function cleanOldAttempts(record, now) {
  record.attempts = record.attempts.filter((stamp) => now - stamp <= WINDOW_MS)
}

function registerFailure(username, ip) {
  const key = toKey(username, ip)
  const record = getRecord(key)
  const now = nowMs()
  cleanOldAttempts(record, now)
  record.attempts.push(now)

  if (record.attempts.length >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_MS
  }

  return {
    lockedUntil: record.lockedUntil,
    attemptsInWindow: record.attempts.length,
  }
}

function registerSuccess(username, ip) {
  attemptsByKey.delete(toKey(username, ip))
}

function getThrottleState(username, ip) {
  const key = toKey(username, ip)
  const record = attemptsByKey.get(key)
  if (!record) {
    return { blocked: false, retryAfterSeconds: 0 }
  }

  const now = nowMs()
  cleanOldAttempts(record, now)
  if (record.lockedUntil > now) {
    return {
      blocked: true,
      retryAfterSeconds: Math.max(1, Math.ceil((record.lockedUntil - now) / 1000)),
    }
  }

  if (!record.attempts.length) {
    attemptsByKey.delete(key)
  }
  return { blocked: false, retryAfterSeconds: 0 }
}

module.exports = {
  registerFailure,
  registerSuccess,
  getThrottleState,
}
