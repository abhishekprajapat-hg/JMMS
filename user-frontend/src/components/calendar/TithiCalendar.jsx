import { useMemo } from 'react'
import { Card } from '../Card'
import { useApp } from '../../context/AppContext'
import {
  buildFallbackDay,
  getMonthGrid,
  getWeekDays,
  toIsoDate,
} from '../../utils/jainCalendar'
import { getLocale, pickByLanguage } from '../../utils/i18n'

const fastingBadgeClass = {
  Upvas: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200',
  Ayambil: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200',
  Ekasana: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200',
}

function getCellClass({ hasFestival, isToday, isSelected }) {
  if (isSelected) {
    return 'border-amber-500 bg-amber-100/85 shadow-[0_10px_24px_rgba(180,83,9,0.18)] dark:border-amber-400 dark:bg-amber-950/45'
  }
  if (hasFestival) {
    return 'border-amber-300 bg-gradient-to-br from-amber-50 to-orange-100/80 shadow-sm dark:border-amber-700/60 dark:from-amber-950/35 dark:to-orange-950/35'
  }
  if (isToday) {
    return 'border-orange-300 bg-orange-50 dark:border-orange-700/70 dark:bg-orange-950/30'
  }
  return 'border-orange-100 bg-white/92 hover:border-amber-300 hover:bg-amber-50/70 dark:border-orange-900/35 dark:bg-zinc-900/85 dark:hover:border-amber-700/60 dark:hover:bg-amber-950/20'
}

function hasValue(value) {
  if (value === null || value === undefined) return false
  if (typeof value !== 'string') return true
  const trimmed = value.trim()
  return Boolean(trimmed && trimmed !== '-' && trimmed.toLowerCase() !== 'not available')
}

function getMetaLine(dayData, copy) {
  if (dayData?.festival && dayData?.kalyanak) return `${dayData.festival} / ${dayData.kalyanak}`
  if (dayData?.kalyanak) return dayData.kalyanak
  if (dayData?.festival) return dayData.festival
  if (dayData?.tithiEndsAt) return `${copy.endsPrefix} ${dayData.tithiEndsAt}`
  if (dayData?.nakshatra) return dayData.nakshatra
  return copy.noFestival
}

function showExactBadge(dayData) {
  return hasValue(dayData?.tithiEndsAt) || hasValue(dayData?.yoga) || hasValue(dayData?.moonSign)
}

export function TithiCalendar({
  activeMonth,
  recordsByDate,
  selectedDate,
  onChangeMonth,
  onSelectDay,
  isLoading = false,
  error = '',
}) {
  const { language } = useApp()
  const monthGrid = useMemo(() => getMonthGrid(activeMonth), [activeMonth])
  const weekDays = getWeekDays(language)
  const todayIso = toIsoDate(new Date())

  const copy = pickByLanguage(language, {
    en: {
      previous: 'Previous',
      next: 'Next',
      loading: 'Loading month Panchang...',
      exact: 'Exact',
      kalyanakChip: 'K',
      endsPrefix: 'Ends',
      noFestival: 'No festival',
    },
    hi: {
      previous: 'पिछला',
      next: 'अगला',
      loading: 'मासिक पंचांग लोड हो रहा है...',
      exact: 'सटीक',
      kalyanakChip: 'क',
      endsPrefix: 'समाप्त',
      noFestival: 'कोई पर्व नहीं',
    },
  })

  return (
    <Card className="overflow-hidden border-amber-200/90 bg-gradient-to-br from-white via-orange-50/55 to-amber-100/50 dark:border-amber-800/45 dark:from-zinc-900 dark:via-zinc-900 dark:to-amber-950/20">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onChangeMonth(-1)}
          className="focus-ring rounded-full border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-50 dark:border-amber-700/70 dark:text-amber-200 dark:hover:bg-zinc-800"
        >
          {copy.previous}
        </button>

        <h2 className="font-serif text-3xl text-orange-900 dark:text-amber-100">
          {activeMonth.toLocaleDateString(getLocale(language), { month: 'long', year: 'numeric' })}
        </h2>

        <button
          type="button"
          onClick={() => onChangeMonth(1)}
          className="focus-ring rounded-full border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-50 dark:border-amber-700/70 dark:text-amber-200 dark:hover:bg-zinc-800"
        >
          {copy.next}
        </button>
      </div>

      {isLoading && (
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.13em] text-orange-700 dark:text-orange-300">
          {copy.loading}
        </p>
      )}
      {error && <p className="mb-3 text-xs font-semibold text-red-700 dark:text-red-300">{error}</p>}

      <div className="-mx-2 overflow-x-auto overflow-y-hidden px-2 pb-2 xl:mx-0 xl:overflow-visible xl:px-0 xl:pb-0">
        <div className="min-w-[720px] xl:min-w-0">
          <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-bold uppercase tracking-[0.14em] text-orange-700 dark:text-orange-300">
            {weekDays.map((weekDay) => (
              <div key={weekDay} className="rounded-lg bg-amber-100/60 py-2 dark:bg-zinc-800/80">
                {weekDay}
              </div>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-7 gap-2">
            {monthGrid.map((dateCell, index) => {
              if (!dateCell) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="min-h-[8.35rem] rounded-xl border border-dashed border-amber-200/75 bg-white/35 dark:border-amber-900/30 dark:bg-zinc-900/30"
                  />
                )
              }

              const isoDate = toIsoDate(dateCell)
              const dayData = recordsByDate.get(isoDate) || buildFallbackDay(dateCell)
              const hasFestival = Boolean(dayData?.festival)
              const hasKalyanak = Boolean(dayData?.kalyanak)
              const fasting = dayData?.fasting || ''
              const exact = showExactBadge(dayData)
              const isToday = isoDate === todayIso
              const isSelected = isoDate === selectedDate

              return (
                <button
                  type="button"
                  key={isoDate}
                  onClick={() => onSelectDay(dayData)}
                  className={`focus-ring flex min-h-[8.35rem] flex-col rounded-xl border p-2 text-left transition ${getCellClass({ hasFestival, isToday, isSelected })}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{dateCell.getDate()}</span>
                    <div className="flex flex-wrap justify-end gap-1">
                      {exact && (
                        <span className="rounded-full border border-orange-200 bg-white/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-orange-700 dark:border-orange-800/60 dark:bg-zinc-900/80 dark:text-orange-200">
                          {copy.exact}
                        </span>
                      )}
                      {hasKalyanak && (
                        <span className="rounded-full border border-orange-200 bg-orange-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-orange-700 dark:border-orange-800/60 dark:bg-orange-950/40 dark:text-orange-200">
                          {copy.kalyanakChip}
                        </span>
                      )}
                      {hasFestival && <span className="mt-1 h-2.5 w-2.5 rounded-full bg-amber-500 shadow-sm" aria-hidden="true" />}
                    </div>
                  </div>

                  <p className="mt-1 line-clamp-1 text-sm font-bold text-orange-950 dark:text-orange-50">{dayData?.tithi || '-'}</p>
                  <p className="line-clamp-1 text-[11px] font-semibold text-orange-700 dark:text-orange-300">{dayData?.lunarDate || dayData?.paksha || '-'}</p>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-zinc-600 dark:text-zinc-300">{getMetaLine(dayData, copy)}</p>

                  <div className="mt-auto flex flex-wrap gap-1 pt-2">
                    {fasting ? (
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${fastingBadgeClass[fasting] || 'border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200'}`}>
                        {fasting}
                      </span>
                    ) : null}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </Card>
  )
}
