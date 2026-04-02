import festivalHighlights from '../data/jainFestivalHighlights.json'
import { useMemo, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { PrimaryButton } from '../components/PrimaryButton'
import { ScreenShell } from '../components/ScreenShell'
import { SectionCard } from '../components/SectionCard'
import { UtilityBar } from '../components/UtilityBar'
import { useApp } from '../context/AppContext'
import { getTheme } from '../theme'
import {
  getLocalPanchangForDate,
  getLocalPanchangForMonth,
  getLocalPanchangRecords,
} from '../services/panchangService'
import {
  createDateMap,
  formatShortDate,
  getMonthGrid,
  getWeekDays,
  parseIsoDate,
  toIsoDate,
} from '../utils/jainCalendar'
import { safeFormatDate } from '../utils/intlSafe'

function getInitialMonth() {
  const today = new Date()
  return new Date(today.getFullYear(), today.getMonth(), 1)
}

function isMeaningful(value) {
  if (value === null || value === undefined) return false
  const trimmed = String(value).trim()
  return Boolean(trimmed && trimmed !== '-' && trimmed.toLowerCase() !== 'not available')
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

function buildCalendarHighlights(localPanchangRecords) {
  const festivalDateByName = new Map()

  localPanchangRecords.forEach((day) => {
    if (isMeaningful(day.festival) && !festivalDateByName.has(day.festival)) {
      festivalDateByName.set(day.festival, day.date)
    }
  })

  const fixedFestivalHighlights = festivalHighlights.map((festival) => ({
    ...festival,
    type: 'festival',
    date: festivalDateByName.get(festival.name) || '',
  }))

  const kalyanakHighlights = localPanchangRecords
    .filter((day) => isMeaningful(day.kalyanak))
    .map((day) => ({
      id: `kalyanak-${day.date}-${slugify(day.kalyanak)}`,
      name: day.kalyanak,
      period: day.lunarDate || formatShortDate(day.date, 'en'),
      description: `Observe ${day.kalyanak} with prayer, scripture study, and a more inward devotional rhythm.`,
      rituals: day.rituals || 'Keep samayik, Navkar jap, and scripture reading as the core observance.',
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
    sunrise: pickValue(dayPanchang?.sunrise, festivalMeta?.sunrise, '-'),
    sunset: pickValue(dayPanchang?.sunset, festivalMeta?.sunset, '-'),
    jainMonth: festivalMeta?.jainMonth || fallback.jainMonth || '-',
    festival: pickValue(festivalMeta?.festival, dayPanchang?.festival, fallback.festival || ''),
    kalyanak: pickValue(dayPanchang?.kalyanak, festivalMeta?.kalyanak, fallback.kalyanak || ''),
    fasting: pickValue(dayPanchang?.fasting, festivalMeta?.fasting, fallback.fasting || ''),
    auspiciousInfo: festivalMeta?.auspiciousInfo || fallback.auspiciousInfo || 'Daily contemplative observance.',
    rituals: festivalMeta?.rituals || fallback.rituals || 'Follow samayik and svadhyay.',
  }
}

export function CalendarScreen() {
  const { darkMode, language, toggleDarkMode, toggleLanguage } = useApp()
  const theme = getTheme(darkMode)
  const localPanchangRecords = useMemo(() => getLocalPanchangRecords(), [])
  const fallbackByDate = useMemo(() => createDateMap(localPanchangRecords), [localPanchangRecords])
  const calendarHighlights = useMemo(
    () => buildCalendarHighlights(localPanchangRecords),
    [localPanchangRecords],
  )
  const [activeMonth, setActiveMonth] = useState(getInitialMonth)
  const [selectedDate, setSelectedDate] = useState(() => toIsoDate(new Date()))
  const [selectedDay, setSelectedDay] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)

  const weekDays = useMemo(() => getWeekDays(language), [language])
  const todayIso = toIsoDate(new Date())
  const todayData = useMemo(() => getLocalPanchangForDate(new Date()), [])
  const activeMonthLabel = safeFormatDate(activeMonth, language === 'hi' ? 'hi-IN' : 'en-IN', {
    month: 'long',
    year: 'numeric',
  })

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

  function changeMonth(offset) {
    setActiveMonth((previous) => new Date(previous.getFullYear(), previous.getMonth() + offset, 1))
  }

  function openDay(dayIso) {
    const day = recordsByDate.get(dayIso) || fallbackByDate.get(dayIso) || getLocalPanchangForDate(dayIso)
    setSelectedDate(dayIso)
    setSelectedDay(day)
    setModalOpen(true)
  }

  return (
    <ScreenShell
      description="Built-in Jain Panchang with daily tithi, lunar date, nakshatra, fasting cues, and festival highlights."
      eyebrow="Tithi Darpan"
      headerContent={(
        <UtilityBar
          darkMode={darkMode}
          language={language}
          onToggleLanguage={toggleLanguage}
          onToggleTheme={toggleDarkMode}
          theme={theme}
        />
      )}
      theme={theme}
      title="Jain Calendar"
    >
      <SectionCard style={styles.stackGap} theme={theme}>
        <Text style={[styles.sectionEyebrow, { color: theme.colors.accentStrong }]}>Today&apos;s Spiritual Snapshot</Text>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
          {todayData.tithi} | {todayData.lunarDate || todayData.jainMonth}
        </Text>
        <Text style={[styles.cardBody, { color: theme.colors.textMuted }]}>{todayData.auspiciousInfo}</Text>
        <View style={styles.detailGrid}>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: theme.colors.textSoft }]}>Nakshatra</Text>
            <Text style={[styles.detailValue, { color: theme.colors.text }]}>{todayData.nakshatra}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: theme.colors.textSoft }]}>Sunrise</Text>
            <Text style={[styles.detailValue, { color: theme.colors.text }]}>{todayData.sunrise}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: theme.colors.textSoft }]}>Sunset</Text>
            <Text style={[styles.detailValue, { color: theme.colors.text }]}>{todayData.sunset}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: theme.colors.textSoft }]}>Fasting</Text>
            <Text style={[styles.detailValue, { color: theme.colors.text }]}>{todayData.fasting || 'Regular observance'}</Text>
          </View>
        </View>
      </SectionCard>

      <SectionCard style={styles.stackGap} theme={theme}>
        <View style={styles.monthHeader}>
          <PrimaryButton onPress={() => changeMonth(-1)} theme={theme} title="Previous" variant="secondary" />
          <Text style={[styles.monthLabel, { color: theme.colors.text }]}>{activeMonthLabel}</Text>
          <PrimaryButton onPress={() => changeMonth(1)} theme={theme} title="Next" variant="secondary" />
        </View>

        <View style={styles.weekHeader}>
          {weekDays.map((day) => (
            <Text key={day} style={[styles.weekLabel, { color: theme.colors.textMuted }]}>
              {day}
            </Text>
          ))}
        </View>

        <View style={styles.gridWrap}>
          {getMonthGrid(activeMonth).map((cellDate, index) => {
            if (!cellDate) {
              return <View key={`empty-${index + 1}`} style={styles.emptyCell} />
            }

            const isoDate = toIsoDate(cellDate)
            const day = recordsByDate.get(isoDate)
            const isSelected = selectedDate === isoDate
            const isToday = isoDate === todayIso

            return (
              <Pressable
                key={isoDate}
                onPress={() => openDay(isoDate)}
                style={[
                  styles.dayCell,
                  {
                    backgroundColor: isSelected ? theme.colors.accent : theme.colors.cardStrong,
                    borderColor: isToday ? theme.colors.accentStrong : theme.colors.border,
                  },
                ]}
              >
                <Text style={[styles.dayNumber, { color: isSelected ? '#ffffff' : theme.colors.text }]}>
                  {cellDate.getDate()}
                </Text>
                <Text style={[styles.dayTithi, { color: isSelected ? '#ffedd5' : theme.colors.textMuted }]}>
                  {String(day?.tithi || '').slice(0, 7) || '-'}
                </Text>
                {(day?.festival || day?.kalyanak) ? <View style={styles.eventDot} /> : null}
              </Pressable>
            )
          })}
        </View>
      </SectionCard>

      <SectionCard style={styles.stackGap} theme={theme}>
        <Text style={[styles.sectionEyebrow, { color: theme.colors.accentStrong }]}>Festival Window</Text>
        {activeMonthHighlights.length === 0 ? (
          <Text style={[styles.cardBody, { color: theme.colors.textMuted }]}>No special highlights mapped for this month.</Text>
        ) : (
          activeMonthHighlights.map((highlight) => (
            <Pressable
              key={highlight.id}
              onPress={() => {
                if (highlight.date) {
                  setSelectedDate(highlight.date)
                  openDay(highlight.date)
                }
              }}
              style={styles.highlightItem}
            >
              <Text style={[styles.highlightTitle, { color: theme.colors.text }]}>{highlight.name}</Text>
              <Text style={[styles.highlightMeta, { color: theme.colors.textMuted }]}>
                {highlight.period || (highlight.date ? formatShortDate(highlight.date, language) : 'Date coming soon')}
              </Text>
              <Text style={[styles.highlightBody, { color: theme.colors.textMuted }]}>{highlight.description}</Text>
            </Pressable>
          ))
        )}
      </SectionCard>

      <Modal animationType="slide" onRequestClose={() => setModalOpen(false)} visible={modalOpen}>
        <View style={[styles.modalWrap, { backgroundColor: theme.colors.background }]}>
          <SectionCard style={styles.modalCard} theme={theme}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
              {selectedDay?.festival || selectedDay?.kalyanak || selectedDay?.tithi || 'Day Details'}
            </Text>
            <Text style={[styles.cardBody, { color: theme.colors.textMuted }]}>
              {selectedDay?.date ? formatShortDate(selectedDay.date, language) : '-'}
            </Text>

            <View style={styles.detailGrid}>
              <View style={styles.detailItem}>
                <Text style={[styles.detailLabel, { color: theme.colors.textSoft }]}>Lunar Date</Text>
                <Text style={[styles.detailValue, { color: theme.colors.text }]}>{selectedDay?.lunarDate || '-'}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={[styles.detailLabel, { color: theme.colors.textSoft }]}>Paksha</Text>
                <Text style={[styles.detailValue, { color: theme.colors.text }]}>{selectedDay?.paksha || '-'}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={[styles.detailLabel, { color: theme.colors.textSoft }]}>Nakshatra</Text>
                <Text style={[styles.detailValue, { color: theme.colors.text }]}>{selectedDay?.nakshatra || '-'}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={[styles.detailLabel, { color: theme.colors.textSoft }]}>Fasting</Text>
                <Text style={[styles.detailValue, { color: theme.colors.text }]}>{selectedDay?.fasting || 'Regular observance'}</Text>
              </View>
            </View>

            <Text style={[styles.sectionEyebrow, { color: theme.colors.accentStrong }]}>Auspicious Info</Text>
            <Text style={[styles.cardBody, { color: theme.colors.textMuted }]}>{selectedDay?.auspiciousInfo || '-'}</Text>

            <Text style={[styles.sectionEyebrow, { color: theme.colors.accentStrong, marginTop: 18 }]}>Suggested Rituals</Text>
            <Text style={[styles.cardBody, { color: theme.colors.textMuted }]}>{selectedDay?.rituals || '-'}</Text>

            <PrimaryButton
              onPress={() => setModalOpen(false)}
              style={styles.stackGap}
              theme={theme}
              title="Close"
              variant="secondary"
            />
          </SectionCard>
        </View>
      </Modal>
    </ScreenShell>
  )
}

const styles = StyleSheet.create({
  stackGap: {
    marginTop: 18,
  },
  sectionEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 28,
    marginTop: 8,
  },
  cardBody: {
    fontSize: 15,
    lineHeight: 24,
    marginTop: 10,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 18,
  },
  detailItem: {
    minWidth: '46%',
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    marginTop: 6,
  },
  monthHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: '800',
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  weekLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  emptyCell: {
    width: '14.285%',
  },
  dayCell: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
    minHeight: 74,
    paddingHorizontal: 4,
    paddingVertical: 8,
    width: '14.285%',
  },
  dayNumber: {
    fontSize: 15,
    fontWeight: '800',
  },
  dayTithi: {
    fontSize: 10,
    marginTop: 6,
    textAlign: 'center',
  },
  eventDot: {
    backgroundColor: '#f59e0b',
    borderRadius: 999,
    height: 6,
    marginTop: 6,
    width: 6,
  },
  highlightItem: {
    marginTop: 16,
  },
  highlightTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  highlightMeta: {
    fontSize: 13,
    marginTop: 6,
  },
  highlightBody: {
    fontSize: 14,
    lineHeight: 22,
    marginTop: 6,
  },
  modalWrap: {
    flex: 1,
    justifyContent: 'center',
    padding: 18,
  },
  modalCard: {
    marginTop: 0,
  },
})
