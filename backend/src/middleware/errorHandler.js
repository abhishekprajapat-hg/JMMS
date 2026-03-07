function notFoundHandler(_req, res) {
  res.status(404).json({
    error: 'Route not found.',
  })
}

function errorHandler(error, _req, res, _next) {
  const statusCode = error.statusCode || 500
  const message = statusCode >= 500 ? 'Internal server error.' : error.message

  if (statusCode >= 500) {
    // Keep stack traces in terminal only.
    // eslint-disable-next-line no-console
    console.error(error)
  }

  res.status(statusCode).json({
    error: message,
  })
}

module.exports = {
  notFoundHandler,
  errorHandler,
}

