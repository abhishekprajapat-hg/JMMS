import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import announcements from '../data/announcements.json'
import fallbackFestivals from '../data/festivals.json'
import { Card } from '../components/Card'
import { TodaysTithiWidget } from '../components/TodaysTithiWidget'
import { useApp } from '../context/AppContext'

function formatDate(value) {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '-'
  return parsed.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
    Number(amount || 0),
  )
}

const quickLinks = [
  { title: 'Donate', to: '/donate', description: 'Support temple seva and community programs.' },
  { title: 'Ebooks', to: '/ebooks', description: 'Read Jain scriptures and spiritual books.' },
  { title: 'Videos', to: '/videos', description: 'Watch pravachan, bhajan, and aarti sessions.' },
  { title: 'Events', to: '/calendar', description: 'View upcoming festivals and important dates.' },
]

export function HomePage() {
  const { homeData, homeLoading, homeError, loadHomeData, mandirProfile } = useApp()

  const upcomingFestivals = useMemo(() => {
    const fromBackend = Array.isArray(homeData?.upcomingEvents)
      ? homeData.upcomingEvents.map((event) => ({
        id: event.id,
        name: event.name,
        date: event.date,
        description: `${event.hall || 'Mandir Hall'}${Number(event.feePerFamily) ? ` | Fee: ${formatCurrency(event.feePerFamily)}` : ''}`,
      }))
      : []
    if (fromBackend.length) return fromBackend.slice(0, 4)
    return [...fallbackFestivals].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 4)
  }, [homeData])

  const latestAnnouncements = useMemo(
    () => [...announcements].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 4),
    [],
  )

  const donationSnapshot = homeData?.donationSnapshot || {
    totalAmount: 0,
    donationCount: 0,
    supporterFamilies: 0,
  }

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl border border-orange-100 bg-gradient-to-br from-white to-orange-50 shadow-[0_20px_45px_rgba(234,88,12,0.12)] dark:border-orange-900/30 dark:from-zinc-900 dark:to-zinc-900">
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="mb-2 inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-orange-800 dark:border-orange-800 dark:bg-orange-950/50 dark:text-orange-200">
              Jain Dharma Digital Portal
            </p>
            <h1 className="font-serif text-4xl leading-tight text-orange-900 dark:text-orange-100 sm:text-5xl">
              {mandirProfile?.name || 'Jain Mandir'}
            </h1>
            <p className="mt-2 text-sm font-semibold text-orange-700 dark:text-orange-300">
              {mandirProfile?.address || 'Spiritual community platform'}
            </p>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-700 dark:text-zinc-300 sm:text-base">
              Welcome to our Jain Mandir website. Explore scriptures, spiritual videos, festival calendar,
              announcements, and seva opportunities in one calm and minimal digital space.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/donate"
                className="focus-ring rounded-full bg-orange-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition hover:brightness-105"
              >
                Offer Donation
              </Link>
              <Link
                to="/calendar"
                className="focus-ring rounded-full border border-orange-300 px-5 py-2.5 text-sm font-bold text-orange-800 transition hover:bg-orange-50 dark:border-orange-700 dark:text-orange-200 dark:hover:bg-zinc-800"
              >
                View Festivals
              </Link>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-orange-100 shadow-lg dark:border-orange-900/40">
            <img
              src="https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1200&q=80"
              alt="Jain mandir architecture"
              className="h-72 w-full object-cover sm:h-80"
            />
          </div>
        </div>
      </section>

      {homeError && (
        <Card className="border-red-200 bg-red-50/70 dark:border-red-900/40 dark:bg-red-950/30">
          <p className="text-sm font-semibold text-red-700 dark:text-red-200">
            Could not load live homepage data: {homeError}
          </p>
          <button
            type="button"
            onClick={loadHomeData}
            className="focus-ring mt-2 rounded-full border border-red-300 px-4 py-2 text-xs font-bold text-red-800 dark:border-red-700 dark:text-red-200"
          >
            Retry
          </button>
        </Card>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-orange-700 dark:text-orange-300">Total Donations</p>
          <p className="mt-2 font-serif text-3xl text-orange-900 dark:text-orange-100">{formatCurrency(donationSnapshot.totalAmount)}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-orange-700 dark:text-orange-300">Donation Entries</p>
          <p className="mt-2 font-serif text-3xl text-orange-900 dark:text-orange-100">{donationSnapshot.donationCount}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-orange-700 dark:text-orange-300">Supporter Families</p>
          <p className="mt-2 font-serif text-3xl text-orange-900 dark:text-orange-100">{donationSnapshot.supporterFamilies}</p>
        </Card>
      </section>

      <section>
        <TodaysTithiWidget />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quickLinks.map((item) => (
          <Card key={item.title} className="flex flex-col">
            <h2 className="font-serif text-2xl text-orange-900 dark:text-orange-100">{item.title}</h2>
            <p className="mt-2 flex-1 text-sm text-zinc-600 dark:text-zinc-300">{item.description}</p>
            <Link
              to={item.to}
              className="focus-ring mt-4 inline-flex w-fit rounded-full border border-orange-200 px-4 py-2 text-sm font-semibold text-orange-800 transition hover:bg-orange-50 dark:border-orange-800 dark:text-orange-200 dark:hover:bg-zinc-800"
            >
              Open
            </Link>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-serif text-2xl text-orange-900 dark:text-orange-100">Upcoming Jain Festivals</h2>
          {homeLoading && <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">Loading festival data...</p>}
          <ul className="mt-4 space-y-3">
            {upcomingFestivals.map((festival) => (
              <li
                key={festival.id}
                className="rounded-xl border border-orange-100 bg-orange-50/60 px-4 py-3 dark:border-orange-900/40 dark:bg-zinc-800/70"
              >
                <p className="text-sm font-bold text-orange-900 dark:text-orange-100">{festival.name}</p>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-orange-700 dark:text-orange-300">
                  {formatDate(festival.date)}
                </p>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{festival.description}</p>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="font-serif text-2xl text-orange-900 dark:text-orange-100">Latest Announcements</h2>
          <ul className="mt-4 space-y-3">
            {latestAnnouncements.map((item) => (
              <li
                key={item.id}
                className="rounded-xl border border-orange-100 bg-white px-4 py-3 dark:border-orange-900/40 dark:bg-zinc-800/70"
              >
                <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100">{item.title}</p>
                <p className="text-xs text-orange-700 dark:text-orange-300">{formatDate(item.date)}</p>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{item.message}</p>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  )
}
