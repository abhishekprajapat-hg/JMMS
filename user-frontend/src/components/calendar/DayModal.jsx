import { Modal } from '../Modal'
import { useApp } from '../../context/AppContext'
import { formatLongDate } from '../../utils/jainCalendar'
import { pickByLanguage } from '../../utils/i18n'

function hasValue(value) {
  if (value === null || value === undefined) return false
  if (typeof value !== 'string') return true
  const trimmed = value.trim()
  return Boolean(trimmed && trimmed !== '-' && trimmed.toLowerCase() !== 'not available')
}

function renderValue(value, fallback = '-') {
  return hasValue(value) ? value : fallback
}

export function DayModal({ open, onClose, day }) {
  const { language } = useApp()
  const copy = pickByLanguage(language, {
    en: {
      title: 'Day Detail',
      noData: 'No details available for the selected day.',
      fullDate: 'Full Date',
      exactProgression: 'Exact Progression',
      guidance: 'Auspicious Guidance',
      guidanceFallback: 'Daily contemplative observance.',
      rituals: 'Suggested Rituals',
      ritualsFallback: 'Follow samayik, svadhyay, and ahimsa-based conduct.',
      sourceNote: 'Source Note',
      none: 'None',
      fastingFallback: 'Daily satvik discipline',
      detailFields: [
        { key: 'lunarDate', label: 'Lunar Date' },
        { key: 'tithi', label: 'Jain Tithi' },
        { key: 'paksha', label: 'Paksha' },
        { key: 'jainMonth', label: 'Jain Month' },
        { key: 'kalyanak', label: 'Kalyanak', fallback: 'None' },
        { key: 'nakshatra', label: 'Nakshatra' },
        { key: 'moonSign', label: 'Moon Sign' },
        { key: 'sunrise', label: 'Sunrise' },
        { key: 'sunset', label: 'Sunset' },
        { key: 'fasting', label: 'Suggested Fasting', fallback: 'Daily satvik discipline' },
        { key: 'festival', label: 'Festival', fallback: 'None' },
      ],
      progressionFields: [
        { key: 'tithiEndsAt', label: 'Tithi Ends' },
        { key: 'nextTithi', label: 'Next Tithi' },
        { key: 'nakshatraEndsAt', label: 'Nakshatra Ends' },
        { key: 'nextNakshatra', label: 'Next Nakshatra' },
        { key: 'yoga', label: 'Yoga' },
        { key: 'karana', label: 'Karana' },
      ],
    },
    hi: {
      title: 'दिन का विवरण',
      noData: 'चुने गए दिन के लिए कोई विवरण उपलब्ध नहीं है।',
      fullDate: 'पूर्ण तिथि',
      exactProgression: 'सटीक क्रम',
      guidance: 'शुभ मार्गदर्शन',
      guidanceFallback: 'दैनिक चिंतनशील पालन करें।',
      rituals: 'सुझाए गए अनुष्ठान',
      ritualsFallback: 'समायिक, स्वाध्याय और अहिंसा-आधारित आचरण अपनाएँ।',
      sourceNote: 'स्रोत नोट',
      none: 'कोई नहीं',
      fastingFallback: 'दैनिक सात्विक अनुशासन',
      detailFields: [
        { key: 'lunarDate', label: 'चंद्र तिथि' },
        { key: 'tithi', label: 'जैन तिथि' },
        { key: 'paksha', label: 'पक्ष' },
        { key: 'jainMonth', label: 'जैन मास' },
        { key: 'kalyanak', label: 'कल्याणक', fallback: 'कोई नहीं' },
        { key: 'nakshatra', label: 'नक्षत्र' },
        { key: 'moonSign', label: 'चंद्र राशि' },
        { key: 'sunrise', label: 'सूर्योदय' },
        { key: 'sunset', label: 'सूर्यास्त' },
        { key: 'fasting', label: 'सुझाया गया उपवास', fallback: 'दैनिक सात्विक अनुशासन' },
        { key: 'festival', label: 'पर्व', fallback: 'कोई नहीं' },
      ],
      progressionFields: [
        { key: 'tithiEndsAt', label: 'तिथि समाप्ति' },
        { key: 'nextTithi', label: 'अगली तिथि' },
        { key: 'nakshatraEndsAt', label: 'नक्षत्र समाप्ति' },
        { key: 'nextNakshatra', label: 'अगला नक्षत्र' },
        { key: 'yoga', label: 'योग' },
        { key: 'karana', label: 'करण' },
      ],
    },
  })

  return (
    <Modal title={copy.title} open={open} onClose={onClose}>
      {!day ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-300">{copy.noData}</p>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-amber-200 bg-[linear-gradient(135deg,rgba(255,251,235,1),rgba(255,237,213,0.86))] px-4 py-4 dark:border-amber-900/45 dark:bg-[linear-gradient(135deg,rgba(69,26,3,0.25),rgba(24,24,27,0.9))]">
            <p className="text-xs font-semibold uppercase tracking-[0.13em] text-orange-700 dark:text-orange-300">{copy.fullDate}</p>
            <p className="mt-1 text-base font-bold text-zinc-900 dark:text-zinc-100">{formatLongDate(day.date, language)}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {hasValue(day.festival) && (
                <span className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-white/85 px-3 py-1 text-xs font-bold text-amber-800 dark:border-amber-700/60 dark:bg-zinc-900/90 dark:text-amber-200">
                  <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" />
                  {day.festival}
                </span>
              )}
              {hasValue(day.kalyanak) && (
                <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700 dark:border-orange-900/40 dark:bg-orange-950/30 dark:text-orange-200">
                  {day.kalyanak}
                </span>
              )}
              {hasValue(day.fasting) && (
                <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
                  {day.fasting}
                </span>
              )}
            </div>
          </div>

          <dl className="grid gap-3 sm:grid-cols-2">
            {copy.detailFields.map((field) => (
              <div key={field.key} className="rounded-xl border border-orange-100 bg-white px-4 py-3 dark:border-orange-900/40 dark:bg-zinc-900">
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-orange-700 dark:text-orange-300">{field.label}</dt>
                <dd className="mt-1 text-sm font-bold text-zinc-800 dark:text-zinc-100">{renderValue(day[field.key], field.fallback || '-')}</dd>
              </div>
            ))}
          </dl>

          <div className="rounded-2xl border border-orange-200/80 bg-white/80 px-4 py-4 dark:border-orange-900/45 dark:bg-zinc-900/75">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-orange-700 dark:text-orange-300">{copy.exactProgression}</p>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              {copy.progressionFields.map((field) => (
                <div key={field.key} className="rounded-xl border border-orange-100 bg-orange-50/70 px-4 py-3 dark:border-orange-900/35 dark:bg-orange-950/20">
                  <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-orange-700 dark:text-orange-300">{field.label}</dt>
                  <dd className="mt-1 text-sm font-bold text-zinc-800 dark:text-zinc-100">{renderValue(day[field.key])}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 dark:border-amber-800/45 dark:bg-amber-950/25">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-orange-700 dark:text-orange-300">{copy.guidance}</p>
            <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-200">{day.auspiciousInfo || copy.guidanceFallback}</p>
          </div>

          <div className="rounded-xl border border-orange-200/80 bg-white/80 px-4 py-3 dark:border-orange-900/45 dark:bg-zinc-900/70">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-orange-700 dark:text-orange-300">{copy.rituals}</p>
            <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-200">{day.rituals || copy.ritualsFallback}</p>
          </div>

          {hasValue(day.sourceNote) && (
            <div className="rounded-xl border border-dashed border-orange-300/80 bg-orange-50/75 px-4 py-3 dark:border-orange-800/50 dark:bg-orange-950/20">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-orange-700 dark:text-orange-300">{copy.sourceNote}</p>
              <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-200">{day.sourceNote}</p>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
