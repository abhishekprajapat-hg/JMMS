function badRequest(message) {
  const error = new Error(message)
  error.statusCode = 400
  return error
}

function unauthorized(message = 'Authentication required.') {
  const error = new Error(message)
  error.statusCode = 401
  return error
}

function forbidden(message = 'Permission denied for this operation.') {
  const error = new Error(message)
  error.statusCode = 403
  return error
}

function notFound(message = 'Resource not found.') {
  const error = new Error(message)
  error.statusCode = 404
  return error
}

function tooManyRequests(message = 'Too many requests. Please try again later.') {
  const error = new Error(message)
  error.statusCode = 429
  return error
}

module.exports = {
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  tooManyRequests,
}
