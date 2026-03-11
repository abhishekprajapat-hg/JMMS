import { Card } from '../Card'

export function FestivalList({
  festivals,
  selectedFestivalId,
  onSelectFestival,
}) {
  const selectedFestival = festivals.find((festival) => festival.id === selectedFestivalId) || festivals[0]

  return (
    <Card className="h-full border-amber-200/90 bg-gradient-to-b from-white to-amber-50/70 dark:border-amber-800/45 dark:from-zinc-900 dark:to-amber-950/15">
      <h2 className="font-serif text-2xl text-orange-900 dark:text-amber-100">Important Jain Festivals</h2>
      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.13em] text-orange-700 dark:text-orange-300">
        Click a festival for details
      </p>

      <div className="mt-4 space-y-2">
        {festivals.map((festival) => {
          const isActive = festival.id === selectedFestival?.id
          return (
            <button
              type="button"
              key={festival.id}
              onClick={() => onSelectFestival(festival.id)}
              className={`focus-ring w-full rounded-xl border px-3 py-2 text-left transition ${
                isActive
                  ? 'border-amber-400 bg-amber-100/80 text-amber-900 dark:border-amber-400/80 dark:bg-amber-950/35 dark:text-amber-100'
                  : 'border-orange-100 bg-white text-zinc-800 hover:border-amber-300 hover:bg-amber-50 dark:border-orange-900/40 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-amber-700/60 dark:hover:bg-zinc-800'
              }`}
            >
              <p className="text-sm font-bold">{festival.name}</p>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-orange-700 dark:text-orange-300">{festival.period}</p>
            </button>
          )
        })}
      </div>

      {selectedFestival && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 dark:border-amber-800/45 dark:bg-amber-950/25">
          <p className="text-sm font-bold text-orange-900 dark:text-amber-100">{selectedFestival.name}</p>
          <p className="mt-2 text-sm leading-6 text-zinc-700 dark:text-zinc-200">{selectedFestival.description}</p>
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-orange-700 dark:text-orange-300">Suggested Rituals</p>
          <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-200">{selectedFestival.rituals}</p>
        </div>
      )}
    </Card>
  )
}
