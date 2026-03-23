import { Card } from '../Card'
import { useApp } from '../../context/AppContext'
import { formatShortDate } from '../../utils/jainCalendar'
import { pickByLanguage } from '../../utils/i18n'

function getMetaLine(festival, language) {
  const parts = []

  if (festival?.date) {
    parts.push(formatShortDate(festival.date, language))
  }
  if (festival?.period) {
    parts.push(festival.period)
  }

  return parts.join(' | ')
}

export function FestivalList({
  festivals,
  monthLabel = '',
  selectedFestivalId,
  onSelectFestival,
}) {
  const { language } = useApp()
  const selectedFestival = festivals.find((festival) => festival.id === selectedFestivalId) || festivals[0]

  const copy = pickByLanguage(language, {
    en: {
      title: 'Festivals And Kalyanak',
      click: 'Click an observance for details',
      monthObservances: 'observances',
      noneTitle: 'No mapped observances for this month.',
      noneDescription: 'Change the calendar month to browse festivals and kalyanaks month wise.',
      kalyanak: 'Kalyanak',
      festival: 'Festival',
      rituals: 'Suggested Rituals',
    },
    hi: {
      title: 'पर्व और कल्याणक',
      click: 'विवरण के लिए किसी भी अवलोकन पर क्लिक करें',
      monthObservances: 'अवलोकन',
      noneTitle: 'इस महीने के लिए कोई मैप्ड अवलोकन नहीं है।',
      noneDescription: 'पर्व और कल्याणक को महीने के अनुसार देखने के लिए कैलेंडर महीना बदलें।',
      kalyanak: 'कल्याणक',
      festival: 'पर्व',
      rituals: 'सुझाए गए अनुष्ठान',
    },
  })

  const selectedLabel = selectedFestival?.type === 'kalyanak' ? copy.kalyanak : copy.festival

  return (
    <Card className="self-start border-amber-200/90 bg-gradient-to-b from-white to-amber-50/70 xl:sticky xl:top-24 dark:border-amber-800/45 dark:from-zinc-900 dark:to-amber-950/15">
      <h2 className="font-serif text-2xl text-orange-900 dark:text-amber-100">{copy.title}</h2>
      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.13em] text-orange-700 dark:text-orange-300">
        {monthLabel ? `${monthLabel} ${copy.monthObservances}` : copy.click}
      </p>

      {festivals.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-orange-200 bg-white/70 px-4 py-5 dark:border-orange-900/35 dark:bg-zinc-900/55">
          <p className="text-sm font-semibold text-orange-900 dark:text-orange-100">{copy.noneTitle}</p>
          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            {copy.noneDescription}
          </p>
        </div>
      ) : (
        <div className="mt-4 grid gap-2">
          {festivals.map((festival) => {
            const isActive = festival.id === selectedFestival?.id

            return (
              <button
                type="button"
                key={festival.id}
                onClick={() => onSelectFestival(festival.id)}
                className={`focus-ring w-full rounded-xl border px-3 py-2.5 text-left transition ${
                  isActive
                    ? 'border-amber-400 bg-amber-100/80 text-amber-900 shadow-[0_10px_20px_rgba(245,158,11,0.12)] dark:border-amber-400/80 dark:bg-amber-950/35 dark:text-amber-100'
                    : 'border-orange-100 bg-white text-zinc-800 hover:border-amber-300 hover:bg-amber-50 dark:border-orange-900/40 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-amber-700/60 dark:hover:bg-zinc-800'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-bold">{festival.name}</p>
                  <span className="rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-orange-700 dark:border-orange-800/60 dark:bg-orange-950/35 dark:text-orange-200">
                    {festival.type === 'kalyanak' ? copy.kalyanak : copy.festival}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-orange-700 dark:text-orange-300">{getMetaLine(festival, language) || '-'}</p>
              </button>
            )
          })}
        </div>
      )}

      {selectedFestival && (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-[linear-gradient(135deg,rgba(255,251,235,1),rgba(254,243,199,0.9))] px-4 py-4 dark:border-amber-800/45 dark:bg-[linear-gradient(135deg,rgba(69,26,3,0.25),rgba(24,24,27,0.9))]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-orange-700 dark:text-orange-300">{selectedLabel}</p>
          <p className="text-sm font-bold text-orange-900 dark:text-amber-100">{selectedFestival.name}</p>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-orange-700 dark:text-orange-300">{getMetaLine(selectedFestival, language) || '-'}</p>
          <p className="mt-2 text-sm leading-6 text-zinc-700 dark:text-zinc-200">{selectedFestival.description}</p>
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-orange-700 dark:text-orange-300">{copy.rituals}</p>
          <p className="mt-1 text-sm leading-6 text-zinc-700 dark:text-zinc-200">{selectedFestival.rituals}</p>
        </div>
      )}
    </Card>
  )
}
