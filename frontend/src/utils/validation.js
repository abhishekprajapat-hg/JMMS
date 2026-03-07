const indianMobilePattern = /^\+91[6-9]\d{9}$/

export function validateIndianWhatsApp(value) {
  return indianMobilePattern.test(value.trim())
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0)
}

export function formatDate(isoDate) {
  if (!isoDate) return '-'
  const date = new Date(isoDate)
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function toISODate(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function isDatePastDue(isoDate, referenceDate = toISODate()) {
  if (!isoDate) return false
  return isoDate < referenceDate
}

