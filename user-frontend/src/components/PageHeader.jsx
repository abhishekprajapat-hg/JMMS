export function PageHeader({ eyebrow, title, description }) {
  return (
    <header className="relative overflow-hidden rounded-[30px] border border-orange-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(255,246,233,0.72))] px-6 py-7 shadow-[0_22px_54px_rgba(132,71,21,0.08)] backdrop-blur-xl dark:border-orange-900/30 dark:bg-[linear-gradient(180deg,rgba(29,22,18,0.82),rgba(19,16,14,0.72))]">
      <div className="pointer-events-none absolute inset-y-0 right-0 w-64 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.28),transparent_56%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(251,146,60,0.14),transparent_58%)]" />
      <div className="relative max-w-4xl">
        {eyebrow && (
          <p className="mb-3 inline-flex rounded-full border border-orange-200/80 bg-orange-50/80 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-800 dark:border-orange-900/40 dark:bg-orange-950/20 dark:text-orange-300">
            {eyebrow}
          </p>
        )}
        <h1 className="font-serif text-4xl leading-none text-orange-950 dark:text-amber-50 sm:text-5xl">{title}</h1>
        {description && (
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-600 dark:text-zinc-300 sm:text-base">
            {description}
          </p>
        )}
      </div>
    </header>
  )
}
