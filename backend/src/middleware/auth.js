const jwt = require('jsonwebtoken')
const { env } = require('../config/env')
const { unauthorized } = require('../utils/http')

function authenticate(req, _res, next) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

  if (!token) {
    return next(unauthorized('Missing bearer token.'))
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret)
    if (payload.tokenType && payload.tokenType !== 'access') {
      return next(unauthorized('Invalid token type.'))
    }
    req.user = payload
    return next()
  } catch (_error) {
    return next(unauthorized('Invalid or expired token.'))
  }
}

module.exports = { authenticate }
