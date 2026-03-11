export function PageHeader({ eyebrow, title, description }) {
  return (
    <header className="mb-6">
      {eyebrow && (
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-orange-700 dark:text-orange-300">
          {eyebrow}
        </p>
      )}
      <h1 className="font-serif text-3xl text-orange-900 dark:text-orange-100 sm:text-4xl">{title}</h1>
      {description && (
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-700 dark:text-zinc-300 sm:text-base">{description}</p>
      )}
    </header>
  )
}

