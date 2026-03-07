const indianMobilePattern = /^\+91[6-9]\d{9}$/

function validateIndianWhatsApp(value) {
  return indianMobilePattern.test(String(value || '').trim())
}

function ensureRequiredString(value) {
  return String(value || '').trim()
}

function ensurePositiveNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : null
}

function ensurePositiveInteger(value) {
  const number = Number(value)
  return Number.isInteger(number) && number > 0 ? number : null
}

module.exports = {
  validateIndianWhatsApp,
  ensureRequiredString,
  ensurePositiveNumber,
  ensurePositiveInteger,
}

