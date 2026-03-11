import { useEffect, useMemo, useState } from 'react'
import { Card } from '../components/Card'
import { PageHeader } from '../components/PageHeader'
import { useApp } from '../context/AppContext'

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
    Number(amount || 0),
  )
}

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

export function ProfilePage() {
  const { currentUser, userData, userDonations, totalDonations, fetchLibrary } = useApp()
  const [ebookCatalog, setEbookCatalog] = useState([])

  useEffect(() => {
    let mounted = true
    fetchLibrary('ebook').then((items) => {
      if (mounted) setEbookCatalog(items)
    })
    return () => {
      mounted = false
    }
  }, [fetchLibrary])

  const savedBooks = useMemo(
    () => ebookCatalog.filter((book) => currentUser?.savedEbookIds.includes(book.id)),
    [ebookCatalog, currentUser],
  )

  const family = userData?.family || userData?.summary?.family || null
  const receipts = userData?.summary?.receipts || []

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Dashboard"
        title="User Profile"
        description="Your profile details, total donations, donation history, saved ebooks, and video watch history."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="font-serif text-2xl text-orange-900 dark:text-orange-100">Profile Details</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <p><strong>Name:</strong> {currentUser?.name || '-'}</p>
            <p><strong>Email:</strong> {currentUser?.email || '-'}</p>
            <p><strong>WhatsApp:</strong> {currentUser?.phone || '-'}</p>
            <p><strong>Family ID:</strong> {currentUser?.familyId || family?.familyId || '-'}</p>
            <p><strong>Gotra:</strong> {family?.gotra || '-'}</p>
            <p><strong>Mandir ID:</strong> {currentUser?.mandirId || '-'}</p>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-orange-600 to-amber-500 text-white dark:from-orange-700 dark:to-amber-600">
          <h2 className="font-serif text-2xl">Total Donations</h2>
          <p className="mt-4 text-4xl font-bold">{formatCurrency(totalDonations)}</p>
          <p className="mt-2 text-sm text-orange-100">Lifetime paid contributions</p>
        </Card>
      </div>

      <Card>
        <h2 className="font-serif text-2xl text-orange-900 dark:text-orange-100">Donation History</h2>
        {userDonations.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">No donations recorded yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-orange-100 text-left text-xs uppercase tracking-[0.12em] text-orange-700 dark:border-orange-900/30 dark:text-orange-300">
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Purpose</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {userDonations.map((donation) => (
                  <tr key={donation.id} className="border-b border-orange-50 dark:border-orange-900/20">
                    <td className="px-3 py-2">{formatDate(donation.date)}</td>
                    <td className="px-3 py-2">{donation.type || '-'}</td>
                    <td className="px-3 py-2">{donation.purpose}</td>
                    <td className="px-3 py-2">{donation.status}</td>
                    <td className="px-3 py-2 font-semibold text-orange-800 dark:text-orange-200">
                      {formatCurrency(donation.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-serif text-2xl text-orange-900 dark:text-orange-100">Saved Ebooks</h2>
          {savedBooks.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">No saved books yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {savedBooks.map((book) => (
                <li key={book.id} className="rounded-lg border border-orange-100 bg-orange-50/60 px-3 py-2 dark:border-orange-900/30 dark:bg-zinc-800/70">
                  <p className="font-semibold text-zinc-800 dark:text-zinc-100">{book.title}</p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300">{book.author}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="font-serif text-2xl text-orange-900 dark:text-orange-100">Video Watch History</h2>
          {!currentUser?.watchHistory?.length ? (
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">No watch history yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {currentUser.watchHistory.slice(0, 8).map((entry) => (
                <li key={`${entry.videoId}-${entry.watchedAt}`} className="rounded-lg border border-orange-100 bg-white px-3 py-2 dark:border-orange-900/30 dark:bg-zinc-800/70">
                  <p className="font-semibold text-zinc-800 dark:text-zinc-100">{entry.title}</p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300">Watched on {formatDate(entry.watchedAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="font-serif text-2xl text-orange-900 dark:text-orange-100">Receipts</h2>
        {receipts.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">No receipt entries available yet.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {receipts.slice(0, 8).map((receipt) => (
              <li key={receipt.transactionId} className="rounded-lg border border-orange-100 bg-white px-3 py-2 dark:border-orange-900/30 dark:bg-zinc-800/70">
                <p className="font-semibold text-zinc-800 dark:text-zinc-100">{receipt.receiptNumber || receipt.transactionId}</p>
                <p className="text-zinc-600 dark:text-zinc-300">{formatDate(receipt.paidAt)} | {formatCurrency(receipt.amount)}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

