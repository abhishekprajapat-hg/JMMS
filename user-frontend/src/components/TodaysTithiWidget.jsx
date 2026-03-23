import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Card } from './Card'
import { useApp } from '../context/AppContext'
import { formatLongDate } from '../utils/jainCalendar'
import { getLocalPanchangForDate } from '../services/panchangService'
import { pickByLanguage } from '../utils/i18n'

export function TodaysTithiWidget() {
  const { language } = useApp()
  const todayInfo = useMemo(() => getLocalPanchangForDate(new Date()), [])

  const copy = pickByLanguage(language, {
    en: {
      eyebrow: 'Tithi Darpan Snapshot',
      title: 'Offline Jain Panchang',
      open: 'Open Tithi Darpan',
      rows: [
        { key: 'tithi', label: 'Tithi' },
        { key: 'paksha', label: 'Paksha' },
        { key: 'nakshatra', label: 'Nakshatra' },
        { key: 'festival', label: 'Festival', fallback: 'None' },
        { key: 'kalyanak', label: 'Kalyanak', fallback: 'None' },
        { key: 'fasting', label: 'Fasting', fallback: 'Regular satvik discipline' },
      ],
    },
    hi: {
      eyebrow: 'तिथि दर्पण झलक',
      title: 'ऑफलाइन जैन पंचांग',
      open: 'तिथि दर्पण खोलें',
      rows: [
        { key: 'tithi', label: 'तिथि' },
        { key: 'paksha', label: 'पक्ष' },
        { key: 'nakshatra', label: 'नक्षत्र' },
        { key: 'festival', label: 'पर्व', fallback: 'कोई नहीं' },
        { key: 'kalyanak', label: 'कल्याणक', fallback: 'कोई नहीं' },
        { key: 'fasting', label: 'उपवास', fallback: 'नियमित सात्विक अनुशासन' },
      ],
    },
  })

  return (
    <Card className="border-orange-200/70 bg-[linear-gradient(135deg,rgba(255,251,235,0.92),rgba(255,237,213,0.82),rgba(255,247,237,0.92))] dark:border-orange-900/30 dark:bg-[linear-gradient(135deg,rgba(31,22,18,0.9),rgba(47,28,19,0.76),rgba(18,16,14,0.92))]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-700 dark:text-orange-300">{copy.eyebrow}</p>
      <h2 className="mt-2 font-serif text-4xl text-orange-950 dark:text-amber-50">{copy.title}</h2>
      <p className="mt-2 text-sm font-semibold text-zinc-600 dark:text-zinc-300">{formatLongDate(todayInfo?.date, language)}</p>

      <div className="mt-5 grid gap-3">
        {copy.rows.map((row) => (
          <div
            key={row.key}
            className="flex items-start justify-between gap-4 rounded-[20px] border border-orange-200/70 bg-white/72 px-4 py-3 dark:border-orange-900/30 dark:bg-white/5"
          >
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-700 dark:text-orange-300">{row.label}</span>
            <span className="text-right text-sm font-semibold text-zinc-800 dark:text-zinc-100">{todayInfo?.[row.key] || row.fallback || '-'}</span>
          </div>
        ))}
      </div>

      <Link
        to="/calendar"
        className="focus-ring mt-5 inline-flex rounded-full bg-[linear-gradient(135deg,#c2410c,#f59e0b)] px-5 py-3 text-sm font-bold text-white shadow-[0_16px_28px_rgba(194,65,12,0.24)] transition hover:brightness-105"
      >
        {copy.open}
      </Link>
    </Card>
  )
}
