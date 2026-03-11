import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Card } from './Card'
import jainCalendarData from '../data/jainCalendarData.json'
import {
  buildFallbackDay,
  createDateMap,
  formatLongDate,
  toIsoDate,
} from '../utils/jainCalendar'

export function TodaysTithiWidget() {
  const todayInfo = useMemo(() => {
    const dateMap = createDateMap(jainCalendarData)
    const todayIso = toIsoDate(new Date())
    return dateMap.get(todayIso) || buildFallbackDay(todayIso)
  }, [])

  return (
    <Card className="border-amber-200 bg-gradient-to-br from-white via-amber-50/70 to-orange-100/65 dark:border-amber-800/45 dark:from-zinc-900 dark:via-amber-950/20 dark:to-zinc-900">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-orange-700 dark:text-orange-300">Today&apos;s Tithi Widget</p>
      <h2 className="mt-1 font-serif text-2xl text-orange-900 dark:text-amber-100">Tithi Snapshot</h2>
      <p className="mt-1 text-sm font-semibold text-zinc-700 dark:text-zinc-200">{formatLongDate(todayInfo?.date)}</p>

      <div className="mt-4 grid gap-2 text-sm">
        <p><span className="font-semibold text-orange-800 dark:text-orange-200">Tithi:</span> {todayInfo?.tithi || '-'}</p>
        <p><span className="font-semibold text-orange-800 dark:text-orange-200">Festival:</span> {todayInfo?.festival || 'None'}</p>
        <p><span className="font-semibold text-orange-800 dark:text-orange-200">Fasting:</span> {todayInfo?.fasting || 'Regular satvik discipline'}</p>
      </div>

      <Link
        to="/calendar"
        className="focus-ring mt-4 inline-flex rounded-full border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-50 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-zinc-800"
      >
        Open Tithi Darpan
      </Link>
    </Card>
  )
}
