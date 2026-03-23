import { useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { pickByLanguage } from '../utils/i18n'

export function Modal({
  title,
  open,
  onClose,
  children,
  disableClose = false,
}) {
  const { language } = useApp()
  const copy = pickByLanguage(language, {
    en: { close: 'Close' },
    hi: { close: 'बंद करें' },
  })

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
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgba(17,10,7,0.62)] p-4 backdrop-blur-md sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !disableClose) onClose()
      }}
    >
      <div className="my-4 max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-[30px] border border-orange-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,247,237,0.92))] p-6 shadow-[0_28px_70px_rgba(0,0,0,0.28)] dark:border-orange-900/30 dark:bg-[linear-gradient(180deg,rgba(29,22,18,0.96),rgba(18,16,14,0.92))]">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="font-serif text-3xl leading-none text-orange-950 dark:text-amber-50">{title}</h2>
          {!disableClose && (
            <button
              type="button"
              onClick={onClose}
              className="focus-ring rounded-full border border-orange-200/80 bg-white/75 px-4 py-2 text-sm font-semibold text-orange-900 transition hover:bg-orange-50 dark:border-orange-900/40 dark:bg-zinc-900/70 dark:text-orange-200 dark:hover:bg-zinc-800"
            >
              {copy.close}
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}
