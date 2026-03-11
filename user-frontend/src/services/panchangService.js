import { toIsoDate } from '../utils/jainCalendar'

const PANCHANG_API_URL =
  import.meta.env.VITE_PANCHANG_API_URL || 'https://astro-api-1qnc.onrender.com/api/v1/vedic/panchang'
const PANCHANG_API_KEY = import.meta.env.VITE_PANCHANG_API_KEY || ''
const DEFAULT_LAT = Number(import.meta.env.VITE_PANCHANG_LAT || 23.1815)
const DEFAULT_LNG = Number(import.meta.env.VITE_PANCHANG_LNG || 79.9864)
const DEFAULT_TZ = import.meta.env.VITE_PANCHANG_TZ || 'Asia/Kolkata'

const dayCache = new Map()

function ensureApiKey() {
  if (PANCHANG_API_KEY) return
  throw new Error('Missing Panchang API key. Set VITE_PANCHANG_API_KEY in your environment.')
}

function normalizeText(value) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return String(value)
  if (typeof value === 'object') {
    if (typeof value.name === 'string') return value.name.trim()
    if (typeof value.label === 'string') return value.label.trim()
    if (typeof value.value === 'string') return value.value.trim()
  }
  return ''
}

function readPath(source, path) {
  return path.split('.').reduce((current, key) => {
    if (current === null || current === undefined) return undefined
    return current[key]
  }, source)
}

function findFirstText(source, paths) {
  for (const path of paths) {
    const value = normalizeText(readPath(source, path))
    if (value) return value
  }
  return ''
}

function inferPaksha(tithi, rawPaksha) {
  const normalizedPaksha = normalizeText(rawPaksha)
  if (normalizedPaksha) return normalizedPaksha
  const tithiText = normalizeText(tithi).toLowerCase()
  if (tithiText.includes('shukla')) return 'Shukla'
  if (tithiText.includes('krishna')) return 'Krishna'
  return ''
}

function normalizePanchangPayload(payload, fallbackDate) {
  const tithi = findFirstText(payload, [
    'tithi',
    'tithi.name',
    'tithi.tithi_name',
    'panchang.tithi',
    'panchang.tithi.name',
    'data.tithi',
    'data.tithi.name',
    'data.panchang.tithi',
    'data.panchang.tithi.name',
  ])

  const pakshaValue = findFirstText(payload, [
    'paksha',
    'tithi.paksha',
    'panchang.paksha',
    'panchang.tithi.paksha',
    'data.paksha',
    'data.tithi.paksha',
    'data.panchang.paksha',
  ])
  const paksha = inferPaksha(tithi, pakshaValue)

  const nakshatra = findFirstText(payload, [
    'nakshatra',
    'nakshatra.name',
    'panchang.nakshatra',
    'panchang.nakshatra.name',
    'data.nakshatra',
    'data.nakshatra.name',
    'data.panchang.nakshatra',
    'data.panchang.nakshatra.name',
  ])

  const sunrise = findFirstText(payload, [
    'sunrise',
    'sunrise_time',
    'sun.sunrise',
    'panchang.sunrise',
    'data.sunrise',
    'data.sunrise_time',
    'data.sun.sunrise',
    'data.panchang.sunrise',
  ])

  const sunset = findFirstText(payload, [
    'sunset',
    'sunset_time',
    'sun.sunset',
    'panchang.sunset',
    'data.sunset',
    'data.sunset_time',
    'data.sun.sunset',
    'data.panchang.sunset',
  ])

  const responseDate = findFirstText(payload, [
    'date',
    'panchang.date',
    'data.date',
    'data.panchang.date',
  ])

  return {
    date: responseDate || fallbackDate,
    tithi: tithi || 'Not Available',
    paksha: paksha || 'Not Available',
    nakshatra: nakshatra || 'Not Available',
    sunrise: sunrise || '-',
    sunset: sunset || '-',
  }
}

function getRequestDateParts(date) {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  }
}

function getCacheKey(date, lat, lng, tzStr) {
  const { year, month, day } = getRequestDateParts(date)
  return `${year}-${month}-${day}-${lat}-${lng}-${tzStr}`
}

function buildUnavailableDay(date) {
  return {
    date: toIsoDate(date),
    tithi: 'Not Available',
    paksha: 'Not Available',
    nakshatra: 'Not Available',
    sunrise: '-',
    sunset: '-',
  }
}

export async function fetchPanchangForDate(date, { lat = DEFAULT_LAT, lng = DEFAULT_LNG, tzStr = DEFAULT_TZ, signal } = {}) {
  ensureApiKey()

  const requestDate = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(requestDate.getTime())) {
    throw new Error('Invalid date passed to fetchPanchangForDate')
  }

  const cacheKey = getCacheKey(requestDate, lat, lng, tzStr)
  if (dayCache.has(cacheKey)) {
    return dayCache.get(cacheKey)
  }

  const { year, month, day } = getRequestDateParts(requestDate)
  const body = { year, month, day, lat, lng, tz_str: tzStr }

  const response = await fetch(PANCHANG_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': PANCHANG_API_KEY,
    },
    body: JSON.stringify(body),
    signal,
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.detail || payload.message || `Panchang request failed with status ${response.status}`)
  }

  const normalized = normalizePanchangPayload(payload, toIsoDate(requestDate))
  dayCache.set(cacheKey, normalized)
  return normalized
}

async function runWithConcurrency(items, limit, mapper) {
  const safeLimit = Math.max(1, limit)
  const results = new Array(items.length)
  let cursor = 0

  async function worker() {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      results[index] = await mapper(items[index], index)
    }
  }

  const workers = Array.from({ length: Math.min(safeLimit, items.length) }, () => worker())
  await Promise.all(workers)
  return results
}

export async function fetchPanchangForMonth(
  year,
  month,
  { lat = DEFAULT_LAT, lng = DEFAULT_LNG, tzStr = DEFAULT_TZ, signal } = {},
) {
  ensureApiKey()

  const daysInMonth = new Date(year, month, 0).getDate()
  const monthDates = Array.from({ length: daysInMonth }, (_, index) => new Date(year, month - 1, index + 1))

  return runWithConcurrency(monthDates, 6, async (date) => {
    try {
      return await fetchPanchangForDate(date, { lat, lng, tzStr, signal })
    } catch (error) {
      if (error?.name === 'AbortError') throw error
      return buildUnavailableDay(date)
    }
  })
}
