import { Card } from '../Card'
import { formatLongDate } from '../../utils/jainCalendar'

const detailFields = [
  { key: 'tithi', label: 'Jain Tithi' },
  { key: 'paksha', label: 'Paksha' },
  { key: 'nakshatra', label: 'Nakshatra' },
  { key: 'sunrise', label: 'Sunrise' },
  { key: 'sunset', label: 'Sunset' },
  { key: 'festival', label: 'Festival' },
]

export function TithiCard({ day, isLoading = false, error = '' }) {
  const hasFestival = Boolean(day?.festival)

  return (
    <Card className="relative overflow-hidden border-amber-200/80 bg-gradient-to-br from-white via-amber-50/60 to-orange-100/60 shadow-[0_18px_38px_rgba(180,83,9,0.12)] dark:border-amber-800/45 dark:from-zinc-900 dark:via-amber-950/30 dark:to-zinc-900">
      <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-amber-300/25 blur-2xl dark:bg-amber-400/18" aria-hidden="true" />
      <div className="absolute -bottom-12 -left-10 h-28 w-28 rounded-full bg-orange-300/30 blur-2xl dark:bg-orange-500/15" aria-hidden="true" />

      <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800 dark:text-amber-300">Today&apos;s Jain Tithi</p>
        <h2 className="mt-1 font-serif text-3xl text-orange-900 dark:text-amber-100">Today&apos;s Jain Panchang</h2>
        <p className="mt-1 text-sm font-semibold text-orange-800 dark:text-amber-200">{formatLongDate(day?.date)}</p>
        {isLoading && (
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.13em] text-orange-700 dark:text-orange-300">
            Fetching live Panchang...
          </p>
        )}
        {error && (
          <p className="mt-2 text-xs font-semibold text-red-700 dark:text-red-300">{error}</p>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {detailFields.map((item) => (
            <div key={item.key} className="rounded-xl border border-amber-200/80 bg-white/80 px-4 py-3 dark:border-amber-900/45 dark:bg-zinc-900/65">
              <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-orange-700 dark:text-orange-300">{item.label}</p>
              <p className="mt-1 text-sm font-bold text-zinc-800 dark:text-zinc-100">{day?.[item.key] || '-'}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 dark:border-amber-800/40 dark:bg-amber-950/25">
          <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-orange-700 dark:text-orange-300">Auspicious Guidance</p>
          <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-200">{day?.auspiciousInfo || 'Daily contemplative observance.'}</p>
        </div>

        {hasFestival && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-bold text-amber-800 dark:border-amber-700/60 dark:bg-zinc-900 dark:text-amber-200">
            <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" />
            Festival Day Highlight
          </div>
        )}
      </div>
    </Card>
  )
}
