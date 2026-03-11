import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import fallbackBooks from '../data/books.json'
import { Card } from '../components/Card'
import { PageHeader } from '../components/PageHeader'
import { useApp } from '../context/AppContext'

export function EbooksPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryFromUrl = searchParams.get('search') || ''
  const [query, setQuery] = useState(queryFromUrl)
  const [category, setCategory] = useState('All')
  const [notice, setNotice] = useState('')
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const { currentUser, toggleSavedEbook, fetchLibrary } = useApp()

  useEffect(() => {
    setQuery(queryFromUrl)
  }, [queryFromUrl])

  useEffect(() => {
    let mounted = true
    setLoading(true)
    fetchLibrary('ebook')
      .then((items) => {
        if (!mounted) return
        if (items.length) {
          setBooks(items)
        } else {
          setBooks(fallbackBooks)
        }
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [fetchLibrary])

  const categories = useMemo(
    () => ['All', ...new Set(books.map((book) => book.category || 'Scripture'))],
    [books],
  )

  const filteredBooks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return books.filter((book) => {
      const categoryMatch = category === 'All' || (book.category || 'Scripture') === category
      const queryMatch =
        !normalizedQuery ||
        [book.title, book.author, book.description, book.category]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery)
      return categoryMatch && queryMatch
    })
  }, [books, query, category])

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
        eyebrow="Digital Library"
        title="Ebooks Library"
        description="Data is loaded from backend library endpoint with local fallback content."
      />

      <Card className="space-y-4">
        <form onSubmit={handleSearchSubmit} className="grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by title, author, topic"
            className="focus-ring rounded-xl border border-orange-200 bg-white px-4 py-2.5 text-sm dark:border-orange-900/40 dark:bg-zinc-900"
            aria-label="Search ebooks"
          />
          <button
            type="submit"
            className="focus-ring rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-105"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap gap-2">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={`focus-ring rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-[0.1em] transition ${
                item === category
                  ? 'bg-orange-600 text-white'
                  : 'border border-orange-200 text-orange-800 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-200 dark:hover:bg-zinc-800'
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          {loading ? 'Loading books...' : `${filteredBooks.length} books found`}
        </p>
        {notice && (
          <p className="rounded-lg bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-900 dark:bg-orange-950/60 dark:text-orange-100">
            {notice}
          </p>
        )}
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filteredBooks.map((book) => {
          const isSaved = currentUser?.savedEbookIds.includes(book.id)
          return (
            <Card key={book.id} className="flex flex-col overflow-hidden p-0">
              <img
                src={book.coverUrl || book.thumbnailUrl || 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=700&q=80'}
                alt={`${book.title} cover`}
                className="h-44 w-full object-cover"
                loading="lazy"
              />
              <div className="flex flex-1 flex-col p-4">
                <span className="mb-2 inline-flex w-fit rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-orange-700 dark:bg-orange-950/60 dark:text-orange-300">
                  {book.category || 'Scripture'}
                </span>
                <h2 className="font-serif text-2xl text-orange-900 dark:text-orange-100">{book.title}</h2>
                <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">{book.author || 'Jain Mandir Library'}</p>
                <p className="mt-2 flex-1 text-sm text-zinc-600 dark:text-zinc-300">{book.description}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <a
                    href={book.readUrl || book.url}
                    target="_blank"
                    rel="noreferrer"
                    className="focus-ring rounded-full bg-orange-600 px-4 py-2 text-xs font-bold text-white"
                  >
                    Read
                  </a>
                  <a
                    href={book.downloadUrl || book.url}
                    target="_blank"
                    rel="noreferrer"
                    className="focus-ring rounded-full border border-orange-300 px-4 py-2 text-xs font-bold text-orange-800 dark:border-orange-700 dark:text-orange-200"
                  >
                    Download
                  </a>
                  <button
                    type="button"
                    onClick={() => handleSaveBook(book.id)}
                    className="focus-ring rounded-full border border-orange-200 px-4 py-2 text-xs font-bold text-zinc-700 dark:border-orange-800 dark:text-zinc-200"
                  >
                    {isSaved ? 'Saved' : 'Save'}
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

