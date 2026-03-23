import jainCalendarData from '../data/jainCalendarData.json'
import { january2026Exact } from '../data/january2026Exact'
import jainKalyanakData from '../data/jainKalyanakData.json'
import { createDateMap, parseIsoDate, toIsoDate } from '../utils/jainCalendar'

const DAY_IN_MS = 24 * 60 * 60 * 1000
const REFERENCE_YEAR = 2026
const NAKSHATRAS = [
  'Ashwini',
  'Bharani',
  'Krittika',
  'Rohini',
  'Mrigashirsha',
  'Ardra',
  'Punarvasu',
  'Pushya',
  'Ashlesha',
  'Magha',
  'Purva Phalguni',
  'Uttara Phalguni',
  'Hasta',
  'Chitra',
  'Swati',
  'Vishakha',
  'Anuradha',
  'Jyeshtha',
  'Mula',
  'Purva Ashadha',
  'Uttara Ashadha',
  'Shravana',
  'Dhanishtha',
  'Shatabhisha',
  'Purva Bhadrapada',
  'Uttara Bhadrapada',
  'Revati',
]
const TITHI_NUMBER = {
  Ekham: 1,
  Beej: 2,
  Trij: 3,
  Chauth: 4,
  Pancham: 5,
  Chhath: 6,
  Satam: 7,
  Atham: 8,
  Nom: 9,
  Dasham: 10,
  Agiyaras: 11,
  Baras: 12,
  Teras: 13,
  Chaudas: 14,
  Poonam: 15,
  Amavasya: 15,
}

function padNumber(value) {
  return String(value).padStart(2, '0')
}

function getMonthDayKey(date) {
  return `${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`
}

function normalizeText(value) {
  return String(value || '').trim()
}

function isMeaningfulValue(value) {
  const normalized = normalizeText(value)
  return Boolean(normalized && normalized !== '-' && normalized.toLowerCase() !== 'not available')
}

function getDayOfYear(date) {
  const startOfYear = new Date(date.getFullYear(), 0, 0)
  return Math.floor((date - startOfYear) / DAY_IN_MS)
}

function formatClockTime(totalMinutes) {
  const minutesInDay = 24 * 60
  const normalized = ((Math.round(totalMinutes) % minutesInDay) + minutesInDay) % minutesInDay
  const hours = Math.floor(normalized / 60)
  const minutes = normalized % 60
  const suffix = hours >= 12 ? 'PM' : 'AM'
  const clockHours = hours % 12 || 12
  return `${padNumber(clockHours)}:${padNumber(minutes)} ${suffix}`
}

function approximateSunrise(date) {
  const seasonalAngle = ((getDayOfYear(date) - 80) / 365) * 2 * Math.PI
  return formatClockTime(365 - Math.sin(seasonalAngle) * 24 - Math.cos(seasonalAngle * 2) * 4)
}

function approximateSunset(date) {
  const seasonalAngle = ((getDayOfYear(date) - 80) / 365) * 2 * Math.PI
  return formatClockTime(1098 + Math.sin(seasonalAngle) * 28 + Math.cos(seasonalAngle * 2) * 5)
}

function inferNakshatra(date, record) {
  const tithiValue = TITHI_NUMBER[record?.tithi] || 1
  const pakshaOffset = normalizeText(record?.paksha).toLowerCase().includes('krishna') ? 13 : 0
  const festivalOffset = record?.festival ? 5 : 0
  const index = (getDayOfYear(date) + tithiValue * 2 + pakshaOffset + festivalOffset) % NAKSHATRAS.length
  return NAKSHATRAS[index]
}

function buildLunarDate(record) {
  const jainMonth = isMeaningfulValue(record?.jainMonth) ? normalizeText(record.jainMonth) : ''
  const paksha = normalizeText(record?.paksha).replace(/\s+Paksha$/i, '')
  const tithi = isMeaningfulValue(record?.tithi) ? normalizeText(record.tithi) : ''
  return [jainMonth, paksha, tithi].filter(Boolean).join(' ')
}

function buildKalyanakAuspiciousInfo(kalyanak) {
  const lower = normalizeText(kalyanak).toLowerCase()

  if (lower.includes('moksha') || lower.includes('nirvana')) {
    return `${kalyanak} today. Keep a liberation-focused routine with stavan, inward silence, and soul reflection.`
  }
  if (lower.includes('keval')) {
    return `${kalyanak} today. Reflect on right vision, scriptural wisdom, and the light of keval gyan.`
  }
  if (lower.includes('garbha')) {
    return `${kalyanak} today. Observe purity, gratitude, and devotional remembrance of the sacred descent.`
  }
  if (lower.includes('janma') && lower.includes('tapa')) {
    return `${kalyanak} today. Remember both divine birth and austerity through disciplined devotion and svadhyay.`
  }
  if (lower.includes('janma')) {
    return `${kalyanak} today. Keep a celebratory yet disciplined schedule with puja, seva, and mantra jap.`
  }
  if (lower.includes('tapa')) {
    return `${kalyanak} today. Honor tapas with restraint, contemplation, and simplified food discipline.`
  }

  return `${kalyanak} today. Keep a reverential schedule with samayik, svadhyay, and ahimsa.`
}

function buildKalyanakRituals(kalyanak) {
  const lower = normalizeText(kalyanak).toLowerCase()

  if (lower.includes('moksha') || lower.includes('nirvana')) {
    return 'Offer moksha kalyanak prayers, recite Navkar Mantra, and keep an introspective, vrat-friendly routine.'
  }
  if (lower.includes('keval')) {
    return 'Read scriptures on keval gyan, do samayik, and keep a calm, knowledge-centered observance.'
  }
  if (lower.includes('garbha')) {
    return 'Offer devotional puja, chant Navkar Mantra, and maintain inner purity with mindful conduct.'
  }
  if (lower.includes('janma') && lower.includes('tapa')) {
    return 'Observe snatra-style devotion, remember the Lord\'s tapas, and practice extra restraint or ayambil if possible.'
  }
  if (lower.includes('janma')) {
    return 'Plan puja, stavan, and charitable seva while keeping the day spiritually celebratory and disciplined.'
  }
  if (lower.includes('tapa')) {
    return 'Practice tapas-oriented restraint, mantra jap, and svadhyay with a simplified satvik routine.'
  }

  return 'Observe the kalyanak with samayik, Navkar Mantra jap, and scripture reading.'
}

function hasCustomAuspiciousInfo(value) {
  const normalized = normalizeText(value)
  if (!normalized) return false
  return !normalized.startsWith('Keep ahimsa-focused routine')
}

function hasCustomRituals(value) {
  const normalized = normalizeText(value)
  if (!normalized) return false
  return !normalized.startsWith('Maintain satvik routine') && !normalized.startsWith('Follow samayik')
}

function buildAuspiciousInfo(record) {
  if (record.kalyanak) {
    const kalyanakInfo = buildKalyanakAuspiciousInfo(record.kalyanak)
    if (hasCustomAuspiciousInfo(record.auspiciousInfo)) {
      return `${kalyanakInfo} ${record.auspiciousInfo}`
    }
    return kalyanakInfo
  }
  if (record.auspiciousInfo) {
    return record.auspiciousInfo
  }
  if (record.festival) {
    return `${record.festival} day. Keep a temple-centered schedule with mantra jap, seva, and svadhyay.`
  }
  if (record.fasting) {
    return `${record.fasting} is recommended today. Maintain restraint, silence where possible, and mindful ahimsa.`
  }

  switch (record.tithi) {
    case 'Atham':
      return 'Atham favors inward austerity, pratikraman, and reduced worldly indulgence.'
    case 'Agiyaras':
      return 'Agiyaras supports vrata, scriptural study, and a lighter sattvik routine.'
    case 'Chaudas':
      return 'Chaudas is ideal for deep reflection, forgiveness, and evening samayik.'
    case 'Poonam':
      return 'Poonam carries a bright devotional tone for puja, daan, and family prayer.'
    case 'Amavasya':
      return "Amavasya invites silence, introspection, and cleansing one's intentions."
    default:
      return `A balanced ${record.paksha || 'daily'} observance for ${record.jainMonth || 'the month'} with samayik and mindful conduct.`
  }
}

function buildRituals(record) {
  if (record.kalyanak) {
    const kalyanakRituals = buildKalyanakRituals(record.kalyanak)
    if (hasCustomRituals(record.rituals)) {
      return `${kalyanakRituals} ${record.rituals}`
    }
    return kalyanakRituals
  }
  if (record.rituals) {
    return record.rituals
  }
  if (record.festival) {
    return `Offer ${record.festival} prayers, recite Navkar Mantra, and join temple rituals if available.`
  }
  if (record.fasting === 'Upvas') {
    return 'Observe upvas with samayik, pratikraman, boiled-water discipline, and quiet devotion.'
  }
  if (record.fasting === 'Ayambil') {
    return 'Keep ayambil discipline, Navpad contemplation, and evening chaitya vandan.'
  }
  if (record.fasting === 'Ekasana') {
    return 'Follow ekasana with svadhyay, mantra jap, and restrained food habits.'
  }

  switch (record.tithi) {
    case 'Atham':
    case 'Chaudas':
      return 'Keep a focused vrat-friendly routine with samayik and pratikraman.'
    case 'Poonam':
      return 'Plan snatra puja, temple darshan, and a devotional family gathering.'
    default:
      return 'Follow samayik, svadhyay, chaitya vandan, and ahimsa-based conduct.'
  }
}

function buildDefaultFasting(record) {
  if (record.festival === 'Paryushan') return 'Upvas'
  if (record.festival === 'Samvatsari') return 'Upvas'
  if (record.festival === 'Ayambil Oli') return 'Ayambil'
  if (record.tithi === 'Atham' || record.tithi === 'Chaudas') return 'Upvas'
  if (record.tithi === 'Agiyaras' || record.tithi === 'Baras') return 'Ekasana'
  return ''
}

function enrichRecord(record, dateOverride) {
  const resolvedDate = dateOverride || parseIsoDate(record.date)
  const isoDate = resolvedDate ? toIsoDate(resolvedDate) : record.date
  const nextRecord = {
    ...record,
    date: isoDate,
    tithi: record.tithi || 'Not Available',
    paksha: record.paksha || 'Not Available',
    jainMonth: record.jainMonth || '-',
    festival: record.festival || '',
    kalyanak: record.kalyanak || '',
  }

  nextRecord.lunarDate = record.lunarDate || buildLunarDate(nextRecord)
  nextRecord.fasting = record.fasting || buildDefaultFasting(nextRecord)
  nextRecord.nakshatra = record.nakshatra || (resolvedDate ? inferNakshatra(resolvedDate, nextRecord) : 'Not Available')
  nextRecord.nakshatraEndsAt = record.nakshatraEndsAt || ''
  nextRecord.nextNakshatra = record.nextNakshatra || ''
  nextRecord.sunrise = record.sunrise || (resolvedDate ? approximateSunrise(resolvedDate) : '-')
  nextRecord.sunset = record.sunset || (resolvedDate ? approximateSunset(resolvedDate) : '-')
  nextRecord.tithiEndsAt = record.tithiEndsAt || ''
  nextRecord.nextTithi = record.nextTithi || ''
  nextRecord.moonSign = record.moonSign || ''
  nextRecord.yoga = record.yoga || ''
  nextRecord.karana = record.karana || ''
  nextRecord.sourceNote = record.sourceNote || ''
  nextRecord.auspiciousInfo = buildAuspiciousInfo(nextRecord)
  nextRecord.rituals = buildRituals(nextRecord)

  return nextRecord
}

const JANUARY_2026_EXACT_BY_DATE = createDateMap(january2026Exact)
const KALYANAK_BY_DATE = createDateMap(jainKalyanakData)
const BASE_RECORDS = jainCalendarData.map((record) =>
  enrichRecord({
    ...record,
    ...(JANUARY_2026_EXACT_BY_DATE.get(record.date) || {}),
    ...(KALYANAK_BY_DATE.get(record.date) || {}),
  }),
)
const BASE_RECORDS_BY_DATE = createDateMap(BASE_RECORDS)
const BASE_RECORDS_BY_MONTH_DAY = new Map(
  BASE_RECORDS.map((record) => {
    const parsed = parseIsoDate(record.date)
    return [parsed ? getMonthDayKey(parsed) : record.date.slice(5), record]
  }),
)

function buildEmptyRecord(date) {
  return {
    date,
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
    auspiciousInfo: 'Local Jain Panchang data is not available for this date.',
    rituals: 'Follow daily samayik and svadhyay.',
  }
}

function buildGeneratedRecord(date) {
  const requestedDate = date instanceof Date ? date : parseIsoDate(date)
  if (!requestedDate) {
    return buildEmptyRecord('')
  }

  const sameMonthDay =
    BASE_RECORDS_BY_MONTH_DAY.get(getMonthDayKey(requestedDate)) ||
    BASE_RECORDS_BY_DATE.get(`${REFERENCE_YEAR}-${getMonthDayKey(requestedDate)}`)

  if (!sameMonthDay) {
    return enrichRecord(buildEmptyRecord(toIsoDate(requestedDate)), requestedDate)
  }

  const generatedRecord = {
    ...sameMonthDay,
    date: toIsoDate(requestedDate),
  }

  if (requestedDate.getFullYear() !== REFERENCE_YEAR) {
    generatedRecord.sourceNote = ''
    generatedRecord.kalyanak = ''
  }

  return enrichRecord(
    generatedRecord,
    requestedDate,
  )
}

export function getLocalPanchangRecords() {
  return BASE_RECORDS
}

export function getLocalPanchangForDate(date) {
  const requestedDate = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(requestedDate.getTime())) {
    throw new Error('Invalid date passed to getLocalPanchangForDate')
  }

  const isoDate = toIsoDate(requestedDate)
  return BASE_RECORDS_BY_DATE.get(isoDate) || buildGeneratedRecord(requestedDate)
}

export function getLocalPanchangForMonth(year, month) {
  const daysInMonth = new Date(year, month, 0).getDate()
  return Array.from({ length: daysInMonth }, (_, index) =>
    getLocalPanchangForDate(new Date(year, month - 1, index + 1)),
  )
}

export async function fetchPanchangForDate(date) {
  return getLocalPanchangForDate(date)
}

export async function fetchPanchangForMonth(year, month) {
  return getLocalPanchangForMonth(year, month)
}
