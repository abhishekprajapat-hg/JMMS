import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest, formatCurrency, formatDate, toAbsoluteUrl } from '../api'
import { usePortal } from '../context/usePortal'

function getInitialState() {
  return {
    mandirProfile: {},
    donationSnapshot: { totalAmount: 0, donationCount: 0, supporterFamilies: 0 },
    featured: { ebooks: [], videos: [] },
    upcomingEvents: [],
  }
}

export function HomePage() {
  const { showNotice } = usePortal()
  const [loading, setLoading] = useState(true)
  const [homeData, setHomeData] = useState(getInitialState)

  useEffect(() => {
    let isMounted = true

    async function loadHome() {
      setLoading(true)
      try {
        const response = await apiRequest('/public/home')
        if (isMounted) {
          setHomeData(response)
        }
      } catch (error) {
        showNotice('error', error.message)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadHome()
    return () => {
      isMounted = false
    }
  }, [showNotice])

  return (
    <>
      <section className="stats-grid items-stretch">
        <article className="backdrop-blur-sm">
          <span>Total Donations</span>
          <strong>{formatCurrency(homeData.donationSnapshot.totalAmount)}</strong>
        </article>
        <article className="backdrop-blur-sm">
          <span>Total Donation Entries</span>
          <strong>{homeData.donationSnapshot.donationCount}</strong>
        </article>
        <article className="backdrop-blur-sm">
          <span>Supporter Families</span>
          <strong>{homeData.donationSnapshot.supporterFamilies}</strong>
        </article>
      </section>

      <section className="content-grid items-start">
        <article className="panel ring-1 ring-amber-100/60">
          <div className="panel-head">
            <h2>Featured Ebooks</h2>
            <p>Digital granthalay highlights for the mandir.</p>
          </div>
          <div className="library-list sm:gap-3">
            {loading && <p>Loading featured ebooks...</p>}
            {!loading && (homeData.featured?.ebooks || []).length === 0 && <p>No ebooks published yet.</p>}
            {(homeData.featured?.ebooks || []).slice(0, 4).map((item) => {
              const coverUrl = toAbsoluteUrl(item.thumbnailUrl)
              return (
                <a
                  key={item.id}
                  className="library-item library-item-with-cover"
                  href={toAbsoluteUrl(item.url)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {coverUrl ? (
                    <img className="library-cover" src={coverUrl} alt={`${item.title} cover`} loading="lazy" />
                  ) : (
                    <div className="library-cover library-cover-fallback" aria-hidden="true">
                      BOOK
                    </div>
                  )}
                  <div className="library-item-content">
                    <span className="chip">ebook</span>
                    <strong>{item.title}</strong>
                    <p>{item.description || 'Open ebook'}</p>
                  </div>
                </a>
              )
            })}
          </div>
          <Link className="inline-link" to="/ebooks">View All Ebooks</Link>
        </article>

        <article className="panel ring-1 ring-amber-100/60">
          <div className="panel-head">
            <h2>Featured Videos</h2>
            <p>Pravachan and dharmik video highlights.</p>
          </div>
          <div className="library-list sm:gap-3">
            {loading && <p>Loading featured videos...</p>}
            {!loading && (homeData.featured?.videos || []).length === 0 && <p>No videos published yet.</p>}
            {(homeData.featured?.videos || []).slice(0, 4).map((item) => {
              const coverUrl = toAbsoluteUrl(item.thumbnailUrl)
              return (
                <a
                  key={item.id}
                  className={`library-item${coverUrl ? ' library-item-with-cover' : ''}`}
                  href={toAbsoluteUrl(item.url)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {coverUrl && (
                    <img className="library-cover" src={coverUrl} alt={`${item.title} cover`} loading="lazy" />
                  )}
                  <div className="library-item-content">
                    <span className="chip">video</span>
                    <strong>{item.title}</strong>
                    <p>{item.description || 'Watch video'}</p>
                  </div>
                </a>
              )
            })}
          </div>
          <Link className="inline-link" to="/videos">View All Videos</Link>
        </article>
      </section>

      <section className="panel ring-1 ring-amber-100/60">
        <div className="panel-head">
          <h2>Upcoming Events</h2>
          <p>Event schedule for the mandir.</p>
        </div>
        <div className="event-list">
          {loading && <p>Loading upcoming events...</p>}
          {!loading && (homeData.upcomingEvents || []).length === 0 && <p>No upcoming events.</p>}
          {(homeData.upcomingEvents || []).map((event) => (
            <div key={event.id} className="event-item">
              <strong>{event.name}</strong>
              <p>{formatDate(event.date)} | {event.hall}</p>
              <p>Fee per family: {formatCurrency(event.feePerFamily || 0)}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}

