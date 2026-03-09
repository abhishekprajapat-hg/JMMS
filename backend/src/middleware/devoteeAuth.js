const jwt = require('jsonwebtoken')
const { env } = require('../config/env')
const { unauthorized } = require('../utils/http')

function authenticateDevotee(req, _res, next) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

  if (!token) {
    return next(unauthorized('Missing bearer token.'))
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret)
    if (payload.tokenType !== 'devotee') {
      return next(unauthorized('Invalid token type.'))
    }
    req.devotee = payload
    return next()
  } catch (_error) {
    return next(unauthorized('Invalid or expired token.'))
  }
}

module.exports = { authenticateDevotee }
