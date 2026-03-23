import { useMemo, useState } from 'react'
import { DayModal } from '../components/calendar/DayModal'
import { FestivalList } from '../components/calendar/FestivalList'
import { TithiCalendar } from '../components/calendar/TithiCalendar'
import { TithiCard } from '../components/calendar/TithiCard'
import { PageHeader } from '../components/PageHeader'
import { useApp } from '../context/AppContext'
import festivalHighlights from '../data/jainFestivalHighlights.json'
import {
  getLocalPanchangForDate,
  getLocalPanchangForMonth,
  getLocalPanchangRecords,
} from '../services/panchangService'
import {
  createDateMap,
  formatShortDate,
  parseIsoDate,
  toIsoDate,
} from '../utils/jainCalendar'
import { getLocale, pickByLanguage } from '../utils/i18n'

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

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function buildKalyanakDescription(name, language) {
  const lower = String(name || '').toLowerCase()

  if (language === 'hi') {
    if (lower.includes('moksha') || lower.includes('nirvana')) {
      return 'मोक्ष, वैराग्य और आत्मा की परम स्वतंत्रता की स्मृति का दिन।'
    }
    if (lower.includes('keval')) {
      return 'केवल ज्ञान के उदय को अध्ययन, सम्यक दृष्टि और चिंतनशील मौन के साथ स्मरण करता है।'
    }
    if (lower.includes('garbha')) {
      return 'पवित्र गर्भ कल्याणक को पवित्रता, भक्ति और कृतज्ञता के साथ चिह्नित करता है।'
    }
    if (lower.includes('janma') && lower.includes('tapa')) {
      return 'एक ही कल्याणक में दिव्य जन्म और महान तप दोनों की स्मृति का पावन अवसर।'
    }
    if (lower.includes('janma')) {
      return 'जन्म कल्याणक को भक्ति, पूजा और अनुशासित सेवा के साथ मनाता है।'
    }
    if (lower.includes('tapa')) {
      return 'तप, संयम और अंतरमुखी साधना की याद दिलाता है।'
    }

    return 'प्रार्थना, श्रद्धा और शास्त्रीय स्मरण के लिए पूज्य जैन कल्याणक दिवस।'
  }

  if (lower.includes('moksha') || lower.includes('nirvana')) {
    return 'Remembrance of liberation, inner detachment, and the soul\'s highest freedom.'
  }
  if (lower.includes('keval')) {
    return 'Honours the awakening of keval gyan through study, right vision, and contemplative silence.'
  }
  if (lower.includes('garbha')) {
    return 'Marks the sacred garbha kalyanak with purity, devotion, and gratitude.'
  }
  if (lower.includes('janma') && lower.includes('tapa')) {
    return 'A sacred observance remembering both divine birth and great austerity in one kalyanak.'
  }
  if (lower.includes('janma')) {
    return 'Celebrates the janma kalyanak with devotional joy, puja, and disciplined seva.'
  }
  if (lower.includes('tapa')) {
    return 'Recalls tapas, restraint, and inward spiritual discipline.'
  }

  return 'A revered Jain kalyanak day for prayer, reverence, and scriptural remembrance.'
}

function buildKalyanakRituals(name, language) {
  const lower = String(name || '').toLowerCase()

  if (language === 'hi') {
    if (lower.includes('moksha') || lower.includes('nirvana')) {
      return 'नवकार मंत्र जपें, मोक्ष भक्ति करें और दिन को अंतर्मुखी व व्रत-उपयुक्त रखें।'
    }
    if (lower.includes('keval')) {
      return 'समायिक करें, शास्त्र पढ़ें और ज्ञान-केंद्रित साधना पर ध्यान दें।'
    }
    if (lower.includes('garbha')) {
      return 'भक्ति-पूजा करें, स्तवन गाएँ और मन, वचन, आचरण को पवित्र रखें।'
    }
    if (lower.includes('janma') && lower.includes('tapa')) {
      return 'स्नात्र-भाव से पूजा करें और साथ में संयम, स्वाध्याय व तपसाधना को स्थान दें।'
    }
    if (lower.includes('janma')) {
      return 'पूजा, स्तवन और सेवा के साथ शांत, आनंदपूर्ण आध्यात्मिक दिनचर्या रखें।'
    }
    if (lower.includes('tapa')) {
      return 'सरल आहार-संयम, मंत्र जाप और तप-केन्द्रित चिंतन करें।'
    }

    return 'समायिक, नवकार मंत्र जाप और शास्त्र वाचन को मुख्य पालन रखें।'
  }

  if (lower.includes('moksha') || lower.includes('nirvana')) {
    return 'Recite Navkar Mantra, sing moksha bhakti, and keep the day introspective and vrat-friendly.'
  }
  if (lower.includes('keval')) {
    return 'Do samayik, read scriptures, and focus on wisdom-centered sadhana.'
  }
  if (lower.includes('garbha')) {
    return 'Offer devotional puja, chant stavan, and keep mind, speech, and conduct pure.'
  }
  if (lower.includes('janma') && lower.includes('tapa')) {
    return 'Observe snatra-style devotion with added restraint, svadhyay, and tapas-inspired discipline.'
  }
  if (lower.includes('janma')) {
    return 'Plan puja, stavan, and seva with a calm, celebratory spiritual routine.'
  }
  if (lower.includes('tapa')) {
    return 'Practice simplified food discipline, mantra jap, and tapas-oriented reflection.'
  }

  return 'Keep samayik, Navkar Mantra jap, and scripture reading as the core observance.'
}

function localizeFestivalHighlight(festival, language) {
  if (language !== 'hi') return festival

  const localized = {
    'mahavir-jayanti': {
      name: 'महावीर जयंती',
      period: 'चैत्र शुक्ल 13',
      description: 'भगवान महावीर के जन्मोत्सव का पर्व, जिसमें शोभायात्रा, शास्त्र वाचन और सेवा शामिल हैं।',
      rituals: 'स्नात्र पूजा, नवकार मंत्र जाप और समाज हित में दान।',
    },
    paryushan: {
      name: 'पर्युषण',
      period: '8 पवित्र दिन',
      description: 'गहन आत्मचिंतन, उपवास, क्षमा और आध्यात्मिक अनुशासन का काल।',
      rituals: 'दैनिक प्रतिक्रमण, स्वाध्याय, एकासन या उपवास और अहिंसा-आधारित आचरण।',
    },
    samvatsari: {
      name: 'संवत्सरी',
      period: 'पर्युषण का अंतिम दिन',
      description: 'सर्वव्यापी क्षमा और आत्मशुद्धि का सर्वोच्च दिवस।',
      rituals: 'संवत्सरी प्रतिक्रमण और "मिच्छामि दुक्कडम्" कहकर क्षमा याचना।',
    },
    'ayambil-oli': {
      name: 'आयम्बिल ओलि',
      period: '9 दिन (वर्ष में दो बार)',
      description: 'संयमित आहार और भक्ति साधना पर केंद्रित नौ दिवसीय तप।',
      rituals: 'आयम्बिल, नवपद पूजा और मंत्र जाप।',
    },
    'diwali-mahavir-nirvana': {
      name: 'दिवाली (महावीर निर्वाण)',
      period: 'आसो वद अमावस्या',
      description: 'भगवान महावीर के निर्वाण और आध्यात्मिक प्रकाश की स्मृति का दिन।',
      rituals: 'निर्वाण लड्डू अर्पण, दीप दान और शास्त्र पाठ।',
    },
    'kartik-poonam': {
      name: 'कार्तिक पूर्णिमा',
      period: 'कार्तिक शुक्ल 15',
      description: 'पूजा, दान और तीर्थयात्रा के लिए अत्यंत शुभ पूर्णिमा।',
      rituals: 'मंदिर दर्शन, स्नात्र पूजा और अनुशासित भक्ति साधना।',
    },
  }

  return {
    ...festival,
    ...(localized[festival.id] || {}),
  }
}

function buildCalendarHighlights(localPanchangRecords, language) {
  const festivalDateByName = new Map()
  localPanchangRecords.forEach((day) => {
    if (isMeaningful(day.festival) && !festivalDateByName.has(day.festival)) {
      festivalDateByName.set(day.festival, day.date)
    }
  })

  const fixedFestivalHighlights = festivalHighlights.map((festival) => {
    const localizedFestival = localizeFestivalHighlight(festival, language)
    return {
      ...localizedFestival,
      type: 'festival',
      date: festivalDateByName.get(festival.name) || '',
    }
  })

  const kalyanakHighlights = localPanchangRecords
    .filter((day) => isMeaningful(day.kalyanak))
    .map((day) => ({
      id: `kalyanak-${day.date}-${slugify(day.kalyanak)}`,
      name: day.kalyanak,
      period: day.lunarDate || formatShortDate(day.date, language),
      description: buildKalyanakDescription(day.kalyanak, language),
      rituals: buildKalyanakRituals(day.kalyanak, language),
      type: 'kalyanak',
      date: day.date,
    }))

  return [...fixedFestivalHighlights, ...kalyanakHighlights].sort((left, right) => {
    if (left.date && right.date) return new Date(left.date) - new Date(right.date)
    if (left.date) return -1
    if (right.date) return 1
    return left.name.localeCompare(right.name)
  })
}

function isJanuary2026Month(date) {
  return date.getFullYear() === 2026 && date.getMonth() === 0
}

function isSameMonth(dateValue, monthDate) {
  const parsed = parseIsoDate(dateValue)
  if (!parsed) return false
  return parsed.getFullYear() === monthDate.getFullYear() && parsed.getMonth() === monthDate.getMonth()
}

function mergePanchangWithFestival(dayPanchang, festivalMeta) {
  const resolvedDate = dayPanchang?.date || festivalMeta?.date || toIsoDate(new Date())
  const fallback = getLocalPanchangForDate(resolvedDate)

  return {
    ...fallback,
    ...festivalMeta,
    date: resolvedDate,
    lunarDate: pickValue(dayPanchang?.lunarDate, festivalMeta?.lunarDate, fallback.lunarDate || ''),
    tithi: pickValue(dayPanchang?.tithi, festivalMeta?.tithi, fallback.tithi || 'Not Available'),
    paksha: pickValue(dayPanchang?.paksha, festivalMeta?.paksha, fallback.paksha || 'Not Available'),
    nakshatra: pickValue(dayPanchang?.nakshatra, festivalMeta?.nakshatra, 'Not Available'),
    nakshatraEndsAt: pickValue(dayPanchang?.nakshatraEndsAt, festivalMeta?.nakshatraEndsAt, fallback.nakshatraEndsAt || ''),
    nextNakshatra: pickValue(dayPanchang?.nextNakshatra, festivalMeta?.nextNakshatra, fallback.nextNakshatra || ''),
    sunrise: pickValue(dayPanchang?.sunrise, festivalMeta?.sunrise, '-'),
    sunset: pickValue(dayPanchang?.sunset, festivalMeta?.sunset, '-'),
    jainMonth: festivalMeta?.jainMonth || fallback.jainMonth || '-',
    festival: pickValue(festivalMeta?.festival, dayPanchang?.festival, fallback.festival || ''),
    kalyanak: pickValue(dayPanchang?.kalyanak, festivalMeta?.kalyanak, fallback.kalyanak || ''),
    fasting: pickValue(dayPanchang?.fasting, festivalMeta?.fasting, fallback.fasting || ''),
    tithiEndsAt: pickValue(dayPanchang?.tithiEndsAt, festivalMeta?.tithiEndsAt, fallback.tithiEndsAt || ''),
    nextTithi: pickValue(dayPanchang?.nextTithi, festivalMeta?.nextTithi, fallback.nextTithi || ''),
    moonSign: pickValue(dayPanchang?.moonSign, festivalMeta?.moonSign, fallback.moonSign || ''),
    yoga: pickValue(dayPanchang?.yoga, festivalMeta?.yoga, fallback.yoga || ''),
    karana: pickValue(dayPanchang?.karana, festivalMeta?.karana, fallback.karana || ''),
    sourceNote: pickValue(dayPanchang?.sourceNote, festivalMeta?.sourceNote, fallback.sourceNote || ''),
    auspiciousInfo: festivalMeta?.auspiciousInfo || fallback.auspiciousInfo || 'Daily contemplative observance.',
    rituals: festivalMeta?.rituals || fallback.rituals || 'Follow samayik and svadhyay.',
  }
}

export function JainCalendarPage() {
  const { language } = useApp()
  const localPanchangRecords = useMemo(() => getLocalPanchangRecords(), [])
  const fallbackByDate = useMemo(() => createDateMap(localPanchangRecords), [localPanchangRecords])
  const calendarHighlights = useMemo(
    () => buildCalendarHighlights(localPanchangRecords, language),
    [language, localPanchangRecords],
  )
  const [activeMonth, setActiveMonth] = useState(getInitialMonth)
  const [selectedDate, setSelectedDate] = useState(() => toIsoDate(new Date()))
  const [selectedDay, setSelectedDay] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedFestivalId, setSelectedFestivalId] = useState(festivalHighlights[0]?.id || '')
  const january2026Active = isJanuary2026Month(activeMonth)
  const activeMonthLabel = activeMonth.toLocaleDateString(getLocale(language), { month: 'long', year: 'numeric' })

  const copy = pickByLanguage(language, {
    en: {
      eyebrow: 'Tithi Darpan',
      title: 'Jain Calendar',
      description: 'Built-in Jain Panchang with daily tithi, lunar date, nakshatra, kalyanak, sunrise, sunset, fasting cues, and festival highlights. January 2026 is source-synced in Tithi Darpan without any external API.',
      januaryTitle: 'January 2026 Source Sync',
      januaryBody: 'This month is now mapped from the Tirthankar Vardhman Calendar 2026 source and presented in a cleaner Tithi Darpan layout with exact lunar date, tithi transition, nakshatra progression, yoga, karana, moon sign, and observance notes.',
    },
    hi: {
      eyebrow: 'तिथि दर्पण',
      title: 'जैन कैलेंडर',
      description: 'दैनिक तिथि, चंद्र तिथि, नक्षत्र, कल्याणक, सूर्योदय, सूर्यास्त, उपवास संकेत और पर्व हाइलाइट्स के साथ बिल्ट-इन जैन पंचांग। जनवरी 2026 तिथि दर्पण में बिना किसी बाहरी API के source-synced है।',
      januaryTitle: 'जनवरी 2026 स्रोत सिंक',
      januaryBody: 'यह महीना अब तिर्थंकर वर्धमान कैलेंडर 2026 स्रोत से मैप किया गया है और अधिक साफ तिथि दर्पण लेआउट में सटीक चंद्र तिथि, तिथि परिवर्तन, नक्षत्र प्रगति, योग, करण, चंद्र राशि और पालन नोट्स के साथ प्रस्तुत है।',
    },
  })

  const todayData = useMemo(() => {
    const now = new Date()
    const todayIso = toIsoDate(now)
    return mergePanchangWithFestival(getLocalPanchangForDate(now), fallbackByDate.get(todayIso))
  }, [fallbackByDate])

  const recordsByDate = useMemo(() => {
    const year = activeMonth.getFullYear()
    const month = activeMonth.getMonth() + 1
    const monthDays = getLocalPanchangForMonth(year, month)
    const mergedMonth = monthDays.map((dayRecord) => mergePanchangWithFestival(dayRecord, fallbackByDate.get(dayRecord.date)))
    return createDateMap(mergedMonth)
  }, [activeMonth, fallbackByDate])

  const activeMonthHighlights = useMemo(
    () => calendarHighlights.filter((highlight) => isSameMonth(highlight.date, activeMonth)),
    [activeMonth, calendarHighlights],
  )
  const visibleSelectedFestivalId =
    activeMonthHighlights.find((highlight) => highlight.id === selectedFestivalId)?.id ||
    activeMonthHighlights[0]?.id ||
    ''

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
    const selectedHighlight = calendarHighlights.find((highlight) => highlight.id === festivalId)
    const resolvedDate =
      selectedHighlight?.date ||
      localPanchangRecords.find((day) => day.festival === selectedHighlight?.name || day.kalyanak === selectedHighlight?.name)?.date

    if (!resolvedDate) return
    const parsedFestivalDate = parseIsoDate(resolvedDate)
    if (parsedFestivalDate) {
      setActiveMonth(new Date(parsedFestivalDate.getFullYear(), parsedFestivalDate.getMonth(), 1))
      setSelectedDate(resolvedDate)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
      />

      <TithiCard day={todayData} />

      {january2026Active && (
        <div className="rounded-2xl border border-orange-200/90 bg-[linear-gradient(135deg,rgba(255,247,237,1),rgba(254,215,170,0.5),rgba(255,251,235,1))] px-5 py-4 shadow-[0_14px_32px_rgba(194,65,12,0.08)] dark:border-orange-900/45 dark:bg-[linear-gradient(135deg,rgba(67,20,7,0.45),rgba(24,24,27,0.92))]">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-orange-700 dark:text-orange-300">{copy.januaryTitle}</p>
          <p className="mt-2 text-sm leading-6 text-zinc-700 dark:text-zinc-200">
            {copy.januaryBody}
          </p>
        </div>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(19rem,0.9fr)] 2xl:grid-cols-[minmax(0,1.75fr)_minmax(21rem,0.85fr)]">
        <TithiCalendar
          activeMonth={activeMonth}
          recordsByDate={recordsByDate}
          selectedDate={selectedDate}
          onChangeMonth={changeMonth}
          onSelectDay={handleDaySelect}
        />

        <FestivalList
          festivals={activeMonthHighlights}
          monthLabel={activeMonthLabel}
          selectedFestivalId={visibleSelectedFestivalId}
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
