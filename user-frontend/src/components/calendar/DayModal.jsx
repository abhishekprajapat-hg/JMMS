import { Modal } from '../Modal'
import { formatLongDate } from '../../utils/jainCalendar'

export function DayModal({ open, onClose, day }) {
  return (
    <Modal title="Day Detail" open={open} onClose={onClose}>
      {!day ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-300">No details available for the selected day.</p>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50/75 px-4 py-3 dark:border-amber-900/45 dark:bg-amber-950/20">
            <p className="text-xs font-semibold uppercase tracking-[0.13em] text-orange-700 dark:text-orange-300">Full Date</p>
            <p className="mt-1 text-base font-bold text-zinc-900 dark:text-zinc-100">{formatLongDate(day.date)}</p>
          </div>

          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-orange-100 bg-white px-4 py-3 dark:border-orange-900/40 dark:bg-zinc-900">
              <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-orange-700 dark:text-orange-300">Jain Tithi</dt>
              <dd className="mt-1 text-sm font-bold text-zinc-800 dark:text-zinc-100">{day.tithi || '-'}</dd>
            </div>
            <div className="rounded-xl border border-orange-100 bg-white px-4 py-3 dark:border-orange-900/40 dark:bg-zinc-900">
              <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-orange-700 dark:text-orange-300">Paksha</dt>
              <dd className="mt-1 text-sm font-bold text-zinc-800 dark:text-zinc-100">{day.paksha || '-'}</dd>
            </div>
            <div className="rounded-xl border border-orange-100 bg-white px-4 py-3 dark:border-orange-900/40 dark:bg-zinc-900">
              <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-orange-700 dark:text-orange-300">Festival</dt>
              <dd className="mt-1 text-sm font-bold text-zinc-800 dark:text-zinc-100">{day.festival || 'None'}</dd>
            </div>
            <div className="rounded-xl border border-orange-100 bg-white px-4 py-3 dark:border-orange-900/40 dark:bg-zinc-900">
              <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-orange-700 dark:text-orange-300">Nakshatra</dt>
              <dd className="mt-1 text-sm font-bold text-zinc-800 dark:text-zinc-100">{day.nakshatra || '-'}</dd>
            </div>
            <div className="rounded-xl border border-orange-100 bg-white px-4 py-3 dark:border-orange-900/40 dark:bg-zinc-900">
              <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-orange-700 dark:text-orange-300">Sunrise</dt>
              <dd className="mt-1 text-sm font-bold text-zinc-800 dark:text-zinc-100">{day.sunrise || '-'}</dd>
            </div>
            <div className="rounded-xl border border-orange-100 bg-white px-4 py-3 dark:border-orange-900/40 dark:bg-zinc-900">
              <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-orange-700 dark:text-orange-300">Sunset</dt>
              <dd className="mt-1 text-sm font-bold text-zinc-800 dark:text-zinc-100">{day.sunset || '-'}</dd>
            </div>
            <div className="rounded-xl border border-orange-100 bg-white px-4 py-3 dark:border-orange-900/40 dark:bg-zinc-900">
              <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-orange-700 dark:text-orange-300">Suggested Fasting</dt>
              <dd className="mt-1 text-sm font-bold text-zinc-800 dark:text-zinc-100">{day.fasting || 'Daily satvik discipline'}</dd>
            </div>
          </dl>

          <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 dark:border-amber-800/45 dark:bg-amber-950/25">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-orange-700 dark:text-orange-300">Suggested Rituals</p>
            <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-200">{day.rituals || 'Follow samayik, svadhyay, and ahimsa-based conduct.'}</p>
          </div>
        </div>
      )}
    </Modal>
  )
}
