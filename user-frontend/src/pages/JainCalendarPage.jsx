import { useEffect, useMemo, useState } from 'react'
import { DayModal } from '../components/calendar/DayModal'
import { FestivalList } from '../components/calendar/FestivalList'
import { TithiCalendar } from '../components/calendar/TithiCalendar'
import { TithiCard } from '../components/calendar/TithiCard'
import { PageHeader } from '../components/PageHeader'
import jainCalendarData from '../data/jainCalendarData.json'
import festivalHighlights from '../data/jainFestivalHighlights.json'
import { fetchPanchangForDate, fetchPanchangForMonth } from '../services/panchangService'
import {
  buildFallbackDay,
  createDateMap,
  parseIsoDate,
  toIsoDate,
} from '../utils/jainCalendar'

function getInitialMonth() {
  const today = new Date()
  return new Date(today.getFullYear(), today.getMonth(), 1)
}

function isMeaningful(value) {
  if (value === null || value === undefined) return false
  if (typeof value !== 'string') return true
  const trimmed = value.trim()
  if (!trimmed) return false
  return trimmed !== '-' && trimmed.toLowerCase() !== 'not available'
}

function pickValue(primaryValue, secondaryValue, fallbackValue) {
  if (isMeaningful(primaryValue)) return primaryValue
  if (isMeaningful(secondaryValue)) return secondaryValue
  return fallbackValue
}

function toFriendlyError(error) {
  const message = error?.message || 'Unable to fetch Panchang data right now.'
  if (message.includes('Missing Panchang API key')) {
    return 'Live Panchang unavailable: add VITE_PANCHANG_API_KEY to enable API data.'
  }
  return message
}

function mergePanchangWithFestival(dayPanchang, festivalMeta) {
  const resolvedDate = dayPanchang?.date || festivalMeta?.date || toIsoDate(new Date())
  const fallback = buildFallbackDay(resolvedDate) || {}

  return {
    ...fallback,
    ...festivalMeta,
    date: resolvedDate,
    tithi: pickValue(dayPanchang?.tithi, festivalMeta?.tithi, fallback.tithi || 'Not Available'),
    paksha: pickValue(dayPanchang?.paksha, festivalMeta?.paksha, fallback.paksha || 'Not Available'),
    nakshatra: pickValue(dayPanchang?.nakshatra, festivalMeta?.nakshatra, 'Not Available'),
    sunrise: pickValue(dayPanchang?.sunrise, festivalMeta?.sunrise, '-'),
    sunset: pickValue(dayPanchang?.sunset, festivalMeta?.sunset, '-'),
    jainMonth: festivalMeta?.jainMonth || fallback.jainMonth || '-',
    festival: festivalMeta?.festival || '',
    fasting: festivalMeta?.fasting || '',
    auspiciousInfo: festivalMeta?.auspiciousInfo || fallback.auspiciousInfo || 'Daily contemplative observance.',
    rituals: festivalMeta?.rituals || fallback.rituals || 'Follow samayik and svadhyay.',
  }
}

function getFallbackMapForMonth(baseDate, fallbackByDate) {
  const monthMap = new Map()
  const year = baseDate.getFullYear()
  const month = baseDate.getMonth()

  fallbackByDate.forEach((record, key) => {
    const parsed = parseIsoDate(key)
    if (!parsed) return
    if (parsed.getFullYear() !== year || parsed.getMonth() !== month) return
    monthMap.set(key, mergePanchangWithFestival(record, record))
  })

  return monthMap
}

export function JainCalendarPage() {
  const fallbackByDate = useMemo(() => createDateMap(jainCalendarData), [])
  const [activeMonth, setActiveMonth] = useState(getInitialMonth)
  const [selectedDate, setSelectedDate] = useState(() => toIsoDate(new Date()))
  const [selectedDay, setSelectedDay] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedFestivalId, setSelectedFestivalId] = useState(festivalHighlights[0]?.id || '')
  const [todayLoading, setTodayLoading] = useState(true)
  const [todayError, setTodayError] = useState('')
  const [monthLoading, setMonthLoading] = useState(true)
  const [monthError, setMonthError] = useState('')
  const [todayData, setTodayData] = useState(() => {
    const todayIso = toIsoDate(new Date())
    return mergePanchangWithFestival(null, fallbackByDate.get(todayIso))
  })
  const [recordsByDate, setRecordsByDate] = useState(() => getFallbackMapForMonth(getInitialMonth(), fallbackByDate))

  useEffect(() => {
    const controller = new AbortController()
    const now = new Date()
    const todayIso = toIsoDate(now)

    setTodayLoading(true)
    setTodayError('')

    async function loadToday() {
      try {
        const panchang = await fetchPanchangForDate(now, { signal: controller.signal })
        if (controller.signal.aborted) return
        setTodayData(mergePanchangWithFestival(panchang, fallbackByDate.get(todayIso)))
      } catch (error) {
        if (controller.signal.aborted) return
        setTodayError(toFriendlyError(error))
        setTodayData(mergePanchangWithFestival(buildFallbackDay(todayIso), fallbackByDate.get(todayIso)))
      } finally {
        if (!controller.signal.aborted) setTodayLoading(false)
      }
    }

    loadToday()
    return () => controller.abort()
  }, [fallbackByDate])

  useEffect(() => {
    const controller = new AbortController()
    const year = activeMonth.getFullYear()
    const month = activeMonth.getMonth() + 1

    setMonthLoading(true)
    setMonthError('')

    async function loadMonth() {
      try {
        const monthDays = await fetchPanchangForMonth(year, month, { signal: controller.signal })
        if (controller.signal.aborted) return
        const mergedMonth = monthDays.map((dayRecord) => mergePanchangWithFestival(dayRecord, fallbackByDate.get(dayRecord.date)))
        setRecordsByDate(createDateMap(mergedMonth))
      } catch (error) {
        if (controller.signal.aborted) return
        setMonthError(toFriendlyError(error))
        setRecordsByDate(getFallbackMapForMonth(activeMonth, fallbackByDate))
      } finally {
        if (!controller.signal.aborted) setMonthLoading(false)
      }
    }

    loadMonth()
    return () => controller.abort()
  }, [activeMonth, fallbackByDate])

  function changeMonth(offset) {
    setActiveMonth((previous) => new Date(previous.getFullYear(), previous.getMonth() + offset, 1))
  }

  function handleDaySelect(dayData) {
    const dayIso = dayData?.date || ''
    if (dayIso) setSelectedDate(dayIso)
    setSelectedDay(dayData || null)
    setIsModalOpen(true)
  }

  function handleFestivalSelect(festivalId) {
    setSelectedFestivalId(festivalId)
    const festivalName = festivalHighlights.find((festival) => festival.id === festivalId)?.name
    if (!festivalName) return
    const matchingDay = jainCalendarData.find((day) => day.festival === festivalName)
    if (!matchingDay) return
    const parsedFestivalDate = parseIsoDate(matchingDay.date)
    if (parsedFestivalDate) {
      setActiveMonth(new Date(parsedFestivalDate.getFullYear(), parsedFestivalDate.getMonth(), 1))
      setSelectedDate(matchingDay.date)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tithi Darpan"
        title="Jain Calendar"
        description="Live Panchang-driven Jain calendar with daily tithi, paksha, nakshatra, sunrise/sunset, and festival highlights."
      />

      <TithiCard day={todayData} isLoading={todayLoading} error={todayError} />

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <TithiCalendar
          activeMonth={activeMonth}
          recordsByDate={recordsByDate}
          selectedDate={selectedDate}
          onChangeMonth={changeMonth}
          onSelectDay={handleDaySelect}
          isLoading={monthLoading}
          error={monthError}
        />

        <FestivalList
          festivals={festivalHighlights}
          selectedFestivalId={selectedFestivalId}
          onSelectFestival={handleFestivalSelect}
        />
      </div>

      <DayModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        day={selectedDay}
      />
    </div>
  )
}
