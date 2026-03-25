import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card } from '../components/Card'
import { PageHeader } from '../components/PageHeader'
import { useApp } from '../context/AppContext'
import { loadFallbackBooks } from '../utils/contentFallbacks'
import {
  formatLocalizedNumber,
  pickByLanguage,
  translateValue,
} from '../utils/i18n'

export function EbooksPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryFromUrl = searchParams.get('search') || ''
  const [query, setQuery] = useState(queryFromUrl)
  const [category, setCategory] = useState('All')
  const [notice, setNotice] = useState('')
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const { currentUser, toggleSavedEbook, fetchLibrary, language } = useApp()
  const deferredQuery = useDeferredValue(query)

  const copy = pickByLanguage(language, {
    en: {
      eyebrow: 'Digital Library',
      title: 'Ebooks Library',
      description: 'A richer reading shelf for Jain scriptures, philosophy, and spiritual study with backend-fed content and graceful local fallback.',
      searchPlaceholder: 'Search by title, author, or topic',
      searchAria: 'Search ebooks',
      search: 'Search',
      loading: 'Loading books...',
      found: (count) => `${formatLocalizedNumber(count, language)} books found`,
      read: 'Read',
      download: 'Download',
      save: 'Save',
      saved: 'Saved',
      defaultCategory: 'Scripture',
      defaultAuthor: 'Jain Mandir Library',
    },
    hi: {
      eyebrow: 'डिजिटल लाइब्रेरी',
      title: 'ईबुक्स लाइब्रेरी',
      description: 'बैकएंड-आधारित सामग्री और सहज लोकल फॉलबैक के साथ जैन शास्त्र, दर्शन और आध्यात्मिक अध्ययन के लिए समृद्ध रीडिंग शेल्फ।',
      searchPlaceholder: 'शीर्षक, लेखक या विषय से खोजें',
      searchAria: 'ईबुक्स खोजें',
      search: 'खोजें',
      loading: 'किताबें लोड हो रही हैं...',
      found: (count) => `${formatLocalizedNumber(count, language)} किताबें मिलीं`,
      read: 'पढ़ें',
      download: 'डाउनलोड',
      save: 'सेव करें',
      saved: 'सेव्ड',
      defaultCategory: 'Scripture',
      defaultAuthor: 'Jain Mandir Library',
    },
  })

  useEffect(() => {
    setQuery(queryFromUrl)
  }, [queryFromUrl])

  useEffect(() => {
    let mounted = true
    const loadBooks = async () => {
      setLoading(true)
      try {
        const items = await fetchLibrary('ebook')
        if (!mounted) return

        if (items.length) {
          setBooks(items)
          return
        }

        const fallbackBooks = await loadFallbackBooks()
        if (mounted) setBooks(fallbackBooks)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadBooks()

    return () => {
      mounted = false
    }
  }, [fetchLibrary])

  const categories = useMemo(
    () => ['All', ...new Set(books.map((book) => book.category || copy.defaultCategory))],
    [books, copy.defaultCategory],
  )

  const filteredBooks = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase()
    return books.filter((book) => {
      const categoryMatch = category === 'All' || (book.category || copy.defaultCategory) === category
      const queryMatch =
        !normalizedQuery ||
        [book.title, book.author, book.description, book.category]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery)
      return categoryMatch && queryMatch
    })
  }, [books, deferredQuery, category, copy.defaultCategory])

  function handleSearchSubmit(event) {
    event.preventDefault()
    const trimmed = query.trim()
    setSearchParams(trimmed ? { search: trimmed } : {})
  }

  function handleSaveBook(bookId) {
    const result = toggleSavedEbook(bookId)
    setNotice(result.message)
    window.setTimeout(() => setNotice(''), 2200)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
      />

      <Card className="space-y-5">
        <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
          <form onSubmit={handleSearchSubmit} className="grid gap-3 md:grid-cols-[1fr_auto]">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy.searchPlaceholder}
              className="focus-ring rounded-[22px] border border-orange-200/80 bg-white/80 px-4 py-3 text-sm dark:border-orange-900/40 dark:bg-zinc-900/70"
              aria-label={copy.searchAria}
            />
            <button
              type="submit"
              className="focus-ring rounded-[22px] bg-[linear-gradient(135deg,#c2410c,#f59e0b)] px-5 py-3 text-sm font-bold text-white transition hover:brightness-105"
            >
              {copy.search}
            </button>
          </form>

          <div className="rounded-[22px] border border-orange-200/70 bg-white/72 px-4 py-3 text-sm font-semibold text-zinc-600 dark:border-orange-900/30 dark:bg-white/5 dark:text-zinc-300">
            {loading ? copy.loading : copy.found(filteredBooks.length)}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={`focus-ring rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] transition ${
                item === category
                  ? 'bg-[linear-gradient(135deg,#c2410c,#f59e0b)] text-white shadow-[0_12px_20px_rgba(194,65,12,0.2)]'
                  : 'border border-orange-200/80 bg-white/74 text-orange-900 hover:bg-orange-50 dark:border-orange-900/40 dark:bg-white/5 dark:text-orange-200 dark:hover:bg-zinc-800'
              }`}
            >
              {translateValue(language, item)}
            </button>
          ))}
        </div>

        {notice && (
          <p className="rounded-[18px] bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-900 dark:bg-orange-950/28 dark:text-orange-100">
            {notice}
          </p>
        )}
      </Card>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {filteredBooks.map((book) => {
          const isSaved = currentUser?.savedEbookIds.includes(book.id)
          return (
            <Card key={book.id} className="group flex flex-col overflow-hidden p-0">
              <div className="relative overflow-hidden">
                <img
                  src={book.coverUrl || book.thumbnailUrl || 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=700&q=80'}
                  alt={`${book.title} cover`}
                  className="h-56 w-full object-cover transition duration-500 group-hover:scale-105"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(32,20,12,0.84))]" />
                <span className="absolute left-4 top-4 inline-flex rounded-full border border-white/30 bg-black/30 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-white backdrop-blur-sm">
                  {translateValue(language, book.category || copy.defaultCategory)}
                </span>
              </div>

              <div className="flex flex-1 flex-col p-5">
                <h2 className="font-serif text-3xl text-orange-950 dark:text-amber-50">{book.title}</h2>
                <p className="mt-1 text-sm font-semibold text-zinc-500 dark:text-zinc-400">{translateValue(language, book.author || copy.defaultAuthor)}</p>
                <p className="mt-3 flex-1 text-sm leading-7 text-zinc-600 dark:text-zinc-300">{book.description}</p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <a
                    href={book.readUrl || book.url}
                    target="_blank"
                    rel="noreferrer"
                    className="focus-ring rounded-full bg-[linear-gradient(135deg,#c2410c,#f59e0b)] px-4 py-2 text-xs font-bold text-white"
                  >
                    {copy.read}
                  </a>
                  <a
                    href={book.downloadUrl || book.url}
                    target="_blank"
                    rel="noreferrer"
                    className="focus-ring rounded-full border border-orange-300/80 px-4 py-2 text-xs font-bold text-orange-900 dark:border-orange-800 dark:text-orange-200"
                  >
                    {copy.download}
                  </a>
                  <button
                    type="button"
                    onClick={() => handleSaveBook(book.id)}
                    className="focus-ring rounded-full border border-orange-200/80 bg-white/72 px-4 py-2 text-xs font-bold text-zinc-700 dark:border-orange-900/40 dark:bg-white/5 dark:text-zinc-200"
                  >
                    {isSaved ? copy.saved : copy.save}
                  </button>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
