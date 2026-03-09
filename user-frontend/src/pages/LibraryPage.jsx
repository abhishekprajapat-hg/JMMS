import { useEffect, useState } from 'react'
import { apiRequest, toAbsoluteUrl } from '../api'
import { usePortal } from '../context/usePortal'

export function LibraryPage({ type, title, subtitle, emptyMessage }) {
  const { showNotice } = usePortal()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])

  useEffect(() => {
    let isMounted = true

    async function loadLibrary() {
      setLoading(true)
      try {
        const query = `?type=${encodeURIComponent(type)}`
        const response = await apiRequest(`/public/library${query}`)
        if (isMounted) {
          setItems(response.items || [])
        }
      } catch (error) {
        showNotice('error', error.message)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadLibrary()
    return () => {
      isMounted = false
    }
  }, [showNotice, type])

  return (
    <section className="panel ring-1 ring-amber-100/60">
      <div className="panel-head space-y-1">
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>

      <div className="library-list sm:gap-3">
        {loading && <p>Loading {type}...</p>}
        {!loading && items.length === 0 && <p>{emptyMessage}</p>}
        {items.map((item) => {
          const itemUrl = toAbsoluteUrl(item.url)
          const coverUrl = toAbsoluteUrl(item.thumbnailUrl)
          const hasCover = Boolean(coverUrl)
          const useCoverLayout = type === 'ebook' || hasCover

          return (
            <a
              key={item.id}
              className={`library-item${useCoverLayout ? ' library-item-with-cover' : ''}`}
              href={itemUrl}
              target="_blank"
              rel="noreferrer"
            >
              {useCoverLayout && (
                hasCover ? (
                  <img className="library-cover" src={coverUrl} alt={`${item.title} cover`} loading="lazy" />
                ) : type === 'ebook' ? (
                  <div className="library-cover library-cover-fallback" aria-hidden="true">
                    BOOK
                  </div>
                ) : null
              )}
              <div className="library-item-content">
                <span className="chip">{type}</span>
                <strong>{item.title}</strong>
                <p>{item.description || `Open ${type}`}</p>
              </div>
            </a>
          )
        })}
      </div>
    </section>
  )
}

