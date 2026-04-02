const MONTH_NAMES = {
  en: {
    short: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    long: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  },
  hi: {
    short: ['Jan', 'Far', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aga', 'Sit', 'Akt', 'Nav', 'Dis'],
    long: ['Janavari', 'Faravari', 'March', 'April', 'Mai', 'June', 'Julai', 'Agast', 'Sitambar', 'Aktubar', 'Navambar', 'Disambar'],
  },
}

const WEEKDAY_NAMES = {
  en: {
    short: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    long: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  },
  hi: {
    short: ['Ravi', 'Som', 'Mangal', 'Budh', 'Guru', 'Shukr', 'Shani'],
    long: ['Ravivar', 'Somvar', 'Mangalvar', 'Budhvar', 'Guruwar', 'Shukravar', 'Shanivar'],
  },
}

function getLanguageFromLocale(locale = 'en-IN') {
  return String(locale || '').toLowerCase().startsWith('hi') ? 'hi' : 'en'
}

function padTwoDigits(value) {
  return String(value).padStart(2, '0')
}

function hasIntlSupport() {
  return typeof Intl !== 'undefined' && typeof Intl.NumberFormat === 'function' && typeof Intl.DateTimeFormat === 'function'
}

function groupIndianDigits(value) {
  const raw = String(value || '0')
  const negative = raw.startsWith('-')
  const digits = negative ? raw.slice(1) : raw

  if (digits.length <= 3) {
    return negative ? `-${digits}` : digits
  }

  const lastThree = digits.slice(-3)
  const leading = digits.slice(0, -3)
  const groupedLeading = leading.replace(/\B(?=(\d{2})+(?!\d))/g, ',')
  const combined = `${groupedLeading},${lastThree}`

  return negative ? `-${combined}` : combined
}

function formatNumericFallback(value, options = {}) {
  const numericValue = Number(value || 0)
  if (!Number.isFinite(numericValue)) return '0'

  const maximumFractionDigits = Number.isInteger(options.maximumFractionDigits) ? options.maximumFractionDigits : 0
  const minimumFractionDigits = Number.isInteger(options.minimumFractionDigits)
    ? options.minimumFractionDigits
    : Math.min(maximumFractionDigits, 0)

  const fixedValue = maximumFractionDigits > 0
    ? numericValue.toFixed(maximumFractionDigits)
    : String(Math.round(numericValue))

  const [wholePart, fractionPart = ''] = fixedValue.split('.')
  const minimumFractionValue = minimumFractionDigits > 0 ? fractionPart.padEnd(minimumFractionDigits, '0') : fractionPart
  const trimmedFraction = maximumFractionDigits > minimumFractionDigits
    ? minimumFractionValue.replace(/0+$/, '')
    : minimumFractionValue

  return trimmedFraction
    ? `${groupIndianDigits(wholePart)}.${trimmedFraction}`
    : groupIndianDigits(wholePart)
}

export function safeFormatNumber(value, locale = 'en-IN', options = {}) {
  if (hasIntlSupport()) {
    try {
      return new Intl.NumberFormat(locale, options).format(Number(value || 0))
    } catch {
      // Fall through to a deterministic formatter.
    }
  }

  return formatNumericFallback(value, options)
}

export function safeFormatCurrency(value, locale = 'en-IN', options = {}) {
  if (hasIntlSupport()) {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
        ...options,
      }).format(Number(value || 0))
    } catch {
      // Fall through to a deterministic formatter.
    }
  }

  const currency = options.currency || 'INR'
  return `${currency} ${formatNumericFallback(value, options)}`
}

export function safeFormatDate(value, locale = 'en-IN', options = {}) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return '-'
  }

  if (hasIntlSupport()) {
    try {
      return value.toLocaleDateString(locale, options)
    } catch {
      // Fall through to a deterministic formatter.
    }
  }

  const language = getLanguageFromLocale(locale)
  const monthStyle = options.month === 'long' ? 'long' : 'short'
  const weekdayStyle = options.weekday === 'long' ? 'long' : 'short'
  const parts = []

  if (options.weekday) {
    parts.push(WEEKDAY_NAMES[language][weekdayStyle][value.getDay()])
  }
  if (options.day) {
    parts.push(options.day === '2-digit' ? padTwoDigits(value.getDate()) : String(value.getDate()))
  }
  if (options.month) {
    parts.push(MONTH_NAMES[language][monthStyle][value.getMonth()])
  }
  if (options.year) {
    parts.push(String(value.getFullYear()))
  }

  if (!parts.length) {
    return `${padTwoDigits(value.getDate())} ${MONTH_NAMES[language].short[value.getMonth()]} ${value.getFullYear()}`
  }

  if (options.weekday && parts.length > 1) {
    return `${parts[0]}, ${parts.slice(1).join(' ')}`
  }

  return parts.join(' ')
}
