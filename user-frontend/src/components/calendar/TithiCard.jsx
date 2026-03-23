import { Card } from '../Card'
import { useApp } from '../../context/AppContext'
import { formatLongDate } from '../../utils/jainCalendar'
import { pickByLanguage } from '../../utils/i18n'

function hasValue(value) {
  if (value === null || value === undefined) return false
  if (typeof value !== 'string') return true
  const trimmed = value.trim()
  return Boolean(trimmed && trimmed !== '-' && trimmed.toLowerCase() !== 'not available')
}

export function TithiCard({ day, isLoading = false, error = '' }) {
  const { language } = useApp()
  const hasFestival = Boolean(day?.festival)
  const hasFasting = Boolean(day?.fasting)
  const hasKalyanak = Boolean(day?.kalyanak)
  const hasSourceNote = Boolean(day?.sourceNote)

  const copy = pickByLanguage(language, {
    en: {
      eyebrow: "Today's Jain Tithi",
      title: "Today's Jain Panchang",
      loading: 'Refreshing Panchang details...',
      sourceSynced: 'Source-synced detail',
      guidance: 'Auspicious Guidance',
      guidanceFallback: 'Daily contemplative observance.',
      rituals: 'Suggested Rituals',
      ritualsFallback: 'Follow samayik, svadhyay, and ahimsa-based conduct.',
      sourceNote: 'Source Note',
      primaryFields: [
        { key: 'lunarDate', label: 'Lunar Date' },
        { key: 'tithi', label: 'Jain Tithi' },
        { key: 'paksha', label: 'Paksha' },
        { key: 'kalyanak', label: 'Kalyanak' },
        { key: 'nakshatra', label: 'Nakshatra' },
        { key: 'moonSign', label: 'Moon Sign' },
        { key: 'sunrise', label: 'Sunrise' },
        { key: 'sunset', label: 'Sunset' },
      ],
      secondaryFields: [
        { key: 'tithiEndsAt', label: 'Tithi Ends' },
        { key: 'nextTithi', label: 'Next Tithi' },
        { key: 'nakshatraEndsAt', label: 'Nakshatra Ends' },
        { key: 'nextNakshatra', label: 'Next Nakshatra' },
        { key: 'yoga', label: 'Yoga' },
        { key: 'karana', label: 'Karana' },
      ],
      progression: 'Exact Progression',
    },
    hi: {
      eyebrow: 'आज की जैन तिथि',
      title: 'आज का जैन पंचांग',
      loading: 'पंचांग विवरण रिफ्रेश हो रहा है...',
      sourceSynced: 'स्रोत-सिंक विवरण',
      guidance: 'शुभ मार्गदर्शन',
      guidanceFallback: 'दैनिक चिंतनशील पालन करें।',
      rituals: 'सुझाए गए अनुष्ठान',
      ritualsFallback: 'समायिक, स्वाध्याय और अहिंसा-आधारित आचरण अपनाएँ।',
      sourceNote: 'स्रोत नोट',
      primaryFields: [
        { key: 'lunarDate', label: 'चंद्र तिथि' },
        { key: 'tithi', label: 'जैन तिथि' },
        { key: 'paksha', label: 'पक्ष' },
        { key: 'kalyanak', label: 'कल्याणक' },
        { key: 'nakshatra', label: 'नक्षत्र' },
        { key: 'moonSign', label: 'चंद्र राशि' },
        { key: 'sunrise', label: 'सूर्योदय' },
        { key: 'sunset', label: 'सूर्यास्त' },
      ],
      secondaryFields: [
        { key: 'tithiEndsAt', label: 'तिथि समाप्ति' },
        { key: 'nextTithi', label: 'अगली तिथि' },
        { key: 'nakshatraEndsAt', label: 'नक्षत्र समाप्ति' },
        { key: 'nextNakshatra', label: 'अगला नक्षत्र' },
        { key: 'yoga', label: 'योग' },
        { key: 'karana', label: 'करण' },
      ],
      progression: 'सटीक क्रम',
    },
  })

  return (
    <Card className="relative overflow-hidden border-amber-200/80 bg-[radial-gradient(circle_at_top_right,_rgba(251,191,36,0.28),_transparent_32%),linear-gradient(135deg,rgba(255,251,235,1),rgba(255,237,213,0.9),rgba(255,247,237,0.95))] shadow-[0_18px_38px_rgba(180,83,9,0.12)] dark:border-amber-800/45 dark:bg-[radial-gradient(circle_at_top_right,_rgba(245,158,11,0.15),_transparent_30%),linear-gradient(135deg,rgba(24,24,27,1),rgba(41,37,36,0.96),rgba(24,24,27,1))]">
      <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-amber-300/20 blur-3xl dark:bg-amber-400/12" aria-hidden="true" />
      <div className="absolute -bottom-14 -left-10 h-32 w-32 rounded-full bg-orange-300/25 blur-3xl dark:bg-orange-500/12" aria-hidden="true" />

      <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800 dark:text-amber-300">{copy.eyebrow}</p>
        <h2 className="mt-1 font-serif text-3xl text-orange-900 dark:text-amber-100">{copy.title}</h2>
        <p className="mt-1 text-sm font-semibold text-orange-800 dark:text-amber-200">{formatLongDate(day?.date, language)}</p>

        {isLoading && (
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.13em] text-orange-700 dark:text-orange-300">
            {copy.loading}
          </p>
        )}
        {error && <p className="mt-2 text-xs font-semibold text-red-700 dark:text-red-300">{error}</p>}

        <div className="mt-4 flex flex-wrap gap-2">
          {hasFestival && (
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/90 bg-white/90 px-3 py-1 text-xs font-bold text-amber-800 dark:border-amber-700/60 dark:bg-zinc-900/90 dark:text-amber-200">
              <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" />
              {day.festival}
            </span>
          )}
          {hasKalyanak && (
            <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700 dark:border-orange-900/50 dark:bg-orange-950/30 dark:text-orange-200">
              {day.kalyanak}
            </span>
          )}
          {hasFasting && (
            <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
              {day.fasting}
            </span>
          )}
          {hasSourceNote && (
            <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700 dark:border-orange-900/50 dark:bg-orange-950/30 dark:text-orange-200">
              {copy.sourceSynced}
            </span>
          )}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {copy.primaryFields.map((item) => (
            <div key={item.key} className="rounded-xl border border-amber-200/80 bg-white/82 px-4 py-3 backdrop-blur-sm dark:border-amber-900/45 dark:bg-zinc-900/68">
              <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-orange-700 dark:text-orange-300">{item.label}</p>
              <p className="mt-1 text-sm font-bold text-zinc-800 dark:text-zinc-100">{hasValue(day?.[item.key]) ? day[item.key] : '-'}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-orange-200/80 bg-white/70 p-4 backdrop-blur-sm dark:border-orange-900/45 dark:bg-zinc-900/55">
          <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-orange-700 dark:text-orange-300">{copy.progression}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {copy.secondaryFields.map((item) => (
              <div key={item.key} className="rounded-xl border border-orange-100 bg-orange-50/70 px-4 py-3 dark:border-orange-900/40 dark:bg-orange-950/20">
                <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-orange-700 dark:text-orange-300">{item.label}</p>
                <p className="mt-1 text-sm font-bold text-zinc-800 dark:text-zinc-100">{hasValue(day?.[item.key]) ? day[item.key] : '-'}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/85 px-4 py-3 dark:border-amber-800/40 dark:bg-amber-950/25">
            <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-orange-700 dark:text-orange-300">{copy.guidance}</p>
            <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-200">{day?.auspiciousInfo || copy.guidanceFallback}</p>
          </div>

          <div className="rounded-xl border border-orange-200/80 bg-white/80 px-4 py-3 dark:border-orange-900/45 dark:bg-zinc-900/65">
            <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-orange-700 dark:text-orange-300">{copy.rituals}</p>
            <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-200">{day?.rituals || copy.ritualsFallback}</p>
          </div>
        </div>

        {hasSourceNote && (
          <div className="mt-4 rounded-xl border border-dashed border-orange-300/80 bg-orange-50/75 px-4 py-3 dark:border-orange-800/50 dark:bg-orange-950/20">
            <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-orange-700 dark:text-orange-300">{copy.sourceNote}</p>
            <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-200">{day.sourceNote}</p>
          </div>
        )}
      </div>
    </Card>
  )
}
