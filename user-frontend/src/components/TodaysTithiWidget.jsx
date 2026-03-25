import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from './Card'
import { useApp } from '../context/AppContext'
import { formatLongDate } from '../utils/jainCalendar'
import { pickByLanguage } from '../utils/i18n'

export function TodaysTithiWidget() {
  const { language } = useApp()
  const [todayInfo, setTodayInfo] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true

    import('../services/panchangService')
      .then(({ getLocalPanchangForDate }) => {
        if (!active) return
        setTodayInfo(getLocalPanchangForDate(new Date()))
      })
      .catch(() => {
        if (!active) return
        setTodayInfo({ date: new Date() })
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const copy = pickByLanguage(language, {
    en: {
      eyebrow: 'Tithi Darpan Snapshot',
      title: 'Offline Jain Panchang',
      loading: 'Loading tithi...',
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
      eyebrow: '\u0924\u093f\u0925\u093f \u0926\u0930\u094d\u092a\u0923 \u091d\u0932\u0915',
      title: '\u0911\u092b\u0932\u093e\u0907\u0928 \u091c\u0948\u0928 \u092a\u0902\u091a\u093e\u0902\u0917',
      loading: '\u0924\u093f\u0925\u093f \u0932\u094b\u0921 \u0939\u094b \u0930\u0939\u0940 \u0939\u0948...',
      open: '\u0924\u093f\u0925\u093f \u0926\u0930\u094d\u092a\u0923 \u0916\u094b\u0932\u0947\u0902',
      rows: [
        { key: 'tithi', label: '\u0924\u093f\u0925\u093f' },
        { key: 'paksha', label: '\u092a\u0915\u094d\u0937' },
        { key: 'nakshatra', label: '\u0928\u0915\u094d\u0937\u0924\u094d\u0930' },
        { key: 'festival', label: '\u092a\u0930\u094d\u0935', fallback: '\u0915\u094b\u0908 \u0928\u0939\u0940\u0902' },
        { key: 'kalyanak', label: '\u0915\u0932\u094d\u092f\u093e\u0923\u0915', fallback: '\u0915\u094b\u0908 \u0928\u0939\u0940\u0902' },
        { key: 'fasting', label: '\u0909\u092a\u0935\u093e\u0938', fallback: '\u0928\u093f\u092f\u092e\u093f\u0924 \u0938\u093e\u0924\u094d\u0935\u093f\u0915 \u0905\u0928\u0941\u0936\u093e\u0938\u0928' },
      ],
    },
  })

  return (
    <Card className="border-orange-200/70 bg-[linear-gradient(135deg,rgba(255,251,235,0.92),rgba(255,237,213,0.82),rgba(255,247,237,0.92))] dark:border-orange-900/30 dark:bg-[linear-gradient(135deg,rgba(31,22,18,0.9),rgba(47,28,19,0.76),rgba(18,16,14,0.92))]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-700 dark:text-orange-300">{copy.eyebrow}</p>
      <h2 className="mt-2 font-serif text-4xl text-orange-950 dark:text-amber-50">{copy.title}</h2>
      <p className="mt-2 text-sm font-semibold text-zinc-600 dark:text-zinc-300">{formatLongDate(todayInfo?.date || new Date(), language)}</p>

      <div className="mt-5 grid gap-3">
        {copy.rows.map((row) => (
          <div
            key={row.key}
            className="flex items-start justify-between gap-4 rounded-[20px] border border-orange-200/70 bg-white/72 px-4 py-3 dark:border-orange-900/30 dark:bg-white/5"
          >
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-700 dark:text-orange-300">{row.label}</span>
            <span className="text-right text-sm font-semibold text-zinc-800 dark:text-zinc-100">
              {todayInfo?.[row.key] || (isLoading ? copy.loading : row.fallback || '-')}
            </span>
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
