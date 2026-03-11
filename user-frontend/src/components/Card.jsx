export function Card({ as = 'article', className = '', children }) {
  const Tag = as
  return (
    <Tag
      className={`rounded-2xl border border-orange-100/80 bg-white/90 p-5 shadow-[0_12px_30px_rgba(234,88,12,0.09)] backdrop-blur-sm dark:border-orange-900/40 dark:bg-zinc-900/80 ${className}`}
    >
      {children}
    </Tag>
  )
}
