import { getLocale } from './i18n'
import { safeFormatDate } from './intlSafe'

const WEEK_DAYS = {
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  hi: ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'],
}

function padNumber(value) {
  return String(value).padStart(2, '0')
}

export function parseIsoDate(value) {
  if (!value || typeof value !== 'string') return null
  const [yearText, monthText, dayText] = value.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null
  const parsed = new Date(year, month - 1, day)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

export function toIsoDate(value) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return ''
  return `${value.getFullYear()}-${padNumber(value.getMonth() + 1)}-${padNumber(value.getDate())}`
}

export function formatLongDate(value, language = 'en') {
  if (!value) return '-'
  const parsed = value instanceof Date ? value : parseIsoDate(value)
  if (!parsed) return '-'
  return safeFormatDate(parsed, getLocale(language), {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export function formatShortDate(value, language = 'en') {
  if (!value) return '-'
  const parsed = value instanceof Date ? value : parseIsoDate(value)
  if (!parsed) return '-'
  return safeFormatDate(parsed, getLocale(language), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function getMonthGrid(baseDate) {
  const year = baseDate.getFullYear()
  const month = baseDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7

  const cells = []
  for (let index = 0; index < totalCells; index += 1) {
    const day = index - firstDay + 1
    if (day > 0 && day <= daysInMonth) {
      cells.push(new Date(year, month, day))
    } else {
      cells.push(null)
    }
  }
  return cells
}

export function getWeekDays(language = 'en') {
  return WEEK_DAYS[language] || WEEK_DAYS.en
}

export function createDateMap(records) {
  const map = new Map()
  records.forEach((record) => {
    if (record?.date) map.set(record.date, record)
  })
  return map
}

export function buildFallbackDay(date) {
  const parsed = date instanceof Date ? date : parseIsoDate(date)
  if (!parsed) return null
  return {
    date: toIsoDate(parsed),
    tithi: 'Not Available',
    paksha: 'Not Available',
    nakshatra: 'Not Available',
    nakshatraEndsAt: '',
    nextNakshatra: '',
    sunrise: '-',
    sunset: '-',
    jainMonth: '-',
    lunarDate: '',
    festival: '',
    kalyanak: '',
    fasting: '',
    tithiEndsAt: '',
    nextTithi: '',
    moonSign: '',
    yoga: '',
    karana: '',
    sourceNote: '',
    auspiciousInfo: 'No calendar data available for this date.',
    rituals: 'Follow daily samayik and svadhyay.',
  }
}
