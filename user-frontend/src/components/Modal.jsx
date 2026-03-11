import { useEffect } from 'react'

export function Modal({
  title,
  open,
  onClose,
  children,
  disableClose = false,
}) {
  useEffect(() => {
    if (!open) return undefined
    function handleEscape(event) {
      if (event.key === 'Escape' && !disableClose) onClose()
    }
    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [open, onClose, disableClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-zinc-950/55 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !disableClose) onClose()
      }}
    >
      <div className="my-4 w-full max-w-2xl overflow-y-auto rounded-2xl border border-orange-100 bg-white p-5 shadow-2xl max-h-[calc(100vh-2rem)] dark:border-orange-900/40 dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-serif text-2xl text-orange-900 dark:text-orange-200">{title}</h2>
          {!disableClose && (
            <button
              type="button"
              onClick={onClose}
              className="focus-ring rounded-full border border-orange-200 px-3 py-1 text-sm font-semibold text-orange-800 transition hover:bg-orange-50 dark:border-orange-800 dark:text-orange-200 dark:hover:bg-zinc-800"
            >
              Close
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}
