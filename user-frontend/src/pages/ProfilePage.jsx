import { useEffect, useMemo, useState } from 'react'
import { toAbsoluteUrl } from '../api'
import { Card } from '../components/Card'
import { PageHeader } from '../components/PageHeader'
import { useApp } from '../context/AppContext'
import {
  formatLocalizedCurrency,
  formatLocalizedDate,
  formatLocalizedNumber,
  pickByLanguage,
  translateValue,
} from '../utils/i18n'

export function ProfilePage() {
  const { currentUser, userData, userDonations, totalDonations, fetchLibrary, language } = useApp()
  const [ebookCatalog, setEbookCatalog] = useState([])

  const copy = pickByLanguage(language, {
    en: {
      eyebrow: 'Dashboard',
      title: 'User Profile',
      description: 'Your profile details, total donations, history, saved reading, and watch activity in one richer dashboard.',
      profileDetails: 'Profile Details',
      devoteeAccount: 'Devotee Account',
      email: 'Email',
      whatsapp: 'WhatsApp',
      familyId: 'Family ID',
      gotra: 'Gotra',
      mandirId: 'Mandir ID',
      lifetimeSeva: 'Lifetime Seva',
      totalDonations: 'Total Donations',
      totalDonationsBody: 'A single view of your paid contributions and devotional support for mandir activities.',
      history: 'History',
      donationHistory: 'Donation history',
      entries: (count) => `${formatLocalizedNumber(count, language)} entries`,
      noDonations: 'No donations recorded yet.',
      date: 'Date',
      type: 'Type',
      purpose: 'Purpose',
      status: 'Status',
      amount: 'Amount',
      readingShelf: 'Reading Shelf',
      savedEbooks: 'Saved ebooks',
      noSavedBooks: 'No saved books yet.',
      watchTrail: 'Watch Trail',
      watchHistory: 'Video watch history',
      noWatchHistory: 'No watch history yet.',
      watchedOn: 'Watched on',
      receipts: 'Receipts',
      receiptArchive: 'Receipt archive',
      noReceipts: 'No receipt entries available yet.',
    },
    hi: {
      eyebrow: 'डैशबोर्ड',
      title: 'उपयोगकर्ता प्रोफाइल',
      description: 'आपकी प्रोफाइल जानकारी, कुल दान, इतिहास, सेव किया गया अध्ययन और वॉच गतिविधि एक समृद्ध डैशबोर्ड में।',
      profileDetails: 'प्रोफाइल विवरण',
      devoteeAccount: 'श्रावक खाता',
      email: 'ईमेल',
      whatsapp: 'WhatsApp',
      familyId: 'परिवार ID',
      gotra: 'गोत्र',
      mandirId: 'मंदिर ID',
      lifetimeSeva: 'आजीवन सेवा',
      totalDonations: 'कुल दान',
      totalDonationsBody: 'मंदिर गतिविधियों के लिए आपके भुगतान किए गए योगदान और भक्तिभावपूर्ण सहयोग का एक साथ दृश्य।',
      history: 'इतिहास',
      donationHistory: 'दान इतिहास',
      entries: (count) => `${formatLocalizedNumber(count, language)} प्रविष्टियाँ`,
      noDonations: 'अभी तक कोई दान दर्ज नहीं है।',
      date: 'तारीख',
      type: 'प्रकार',
      purpose: 'उद्देश्य',
      status: 'स्थिति',
      amount: 'राशि',
      readingShelf: 'रीडिंग शेल्फ',
      savedEbooks: 'सेव की गई ईबुक्स',
      noSavedBooks: 'अभी तक कोई सेव की गई किताब नहीं है।',
      watchTrail: 'वॉच ट्रेल',
      watchHistory: 'वीडियो वॉच इतिहास',
      noWatchHistory: 'अभी तक कोई वॉच इतिहास नहीं है।',
      watchedOn: 'देखा गया',
      receipts: 'रसीदें',
      receiptArchive: 'रसीद संग्रह',
      noReceipts: 'अभी तक कोई रसीद प्रविष्टि उपलब्ध नहीं है।',
    },
  })

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
  const receipts = useMemo(() => userData?.summary?.receipts || [], [userData])
  const receiptForLabel = language === 'hi' ? '\u0930\u0938\u0940\u0926 \u0915\u0947 \u0932\u093f\u090f' : 'Receipt for'
  const viewReceiptLabel = language === 'hi' ? '\u0930\u0938\u0940\u0926 \u0926\u0947\u0916\u0947\u0902' : 'View Receipt'
  const downloadPdfLabel = language === 'hi' ? '\u092a\u0940\u0921\u0940\u090f\u092b \u0921\u093e\u0909\u0928\u0932\u094b\u0921 \u0915\u0930\u0947\u0902' : 'Download PDF'
  const sortedReceipts = useMemo(
    () => [...receipts].sort((left, right) => String(right.paidAt || '').localeCompare(String(left.paidAt || ''))),
    [receipts],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
      />

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-700 dark:text-orange-300">{copy.profileDetails}</p>
          <h2 className="mt-2 font-serif text-4xl text-orange-950 dark:text-amber-50">{currentUser?.name || copy.devoteeAccount}</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[22px] border border-orange-200/70 bg-white/72 px-4 py-3 dark:border-orange-900/30 dark:bg-white/5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-orange-700 dark:text-orange-300">{copy.email}</p>
              <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-200">{currentUser?.email || '-'}</p>
            </div>
            <div className="rounded-[22px] border border-orange-200/70 bg-white/72 px-4 py-3 dark:border-orange-900/30 dark:bg-white/5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-orange-700 dark:text-orange-300">{copy.whatsapp}</p>
              <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-200">{currentUser?.phone || '-'}</p>
            </div>
            <div className="rounded-[22px] border border-orange-200/70 bg-white/72 px-4 py-3 dark:border-orange-900/30 dark:bg-white/5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-orange-700 dark:text-orange-300">{copy.familyId}</p>
              <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-200">{currentUser?.familyId || family?.familyId || '-'}</p>
            </div>
            <div className="rounded-[22px] border border-orange-200/70 bg-white/72 px-4 py-3 dark:border-orange-900/30 dark:bg-white/5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-orange-700 dark:text-orange-300">{copy.gotra}</p>
              <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-200">{family?.gotra || '-'}</p>
            </div>
            <div className="rounded-[22px] border border-orange-200/70 bg-white/72 px-4 py-3 dark:border-orange-900/30 dark:bg-white/5 sm:col-span-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-orange-700 dark:text-orange-300">{copy.mandirId}</p>
              <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-200">{currentUser?.mandirId || '-'}</p>
            </div>
          </div>
        </Card>

        <article
          className="relative overflow-hidden rounded-[30px] border border-orange-500/30 p-6 text-white shadow-[0_26px_60px_rgba(138,76,24,0.22)]"
          style={{
            backgroundImage: 'linear-gradient(135deg, #7c2d12 0%, #c2410c 48%, #f59e0b 100%)',
          }}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.24),transparent_34%)]" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(180deg,transparent,rgba(120,53,15,0.24))]" />
          <div className="relative">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-50/90">{copy.lifetimeSeva}</p>
            <h2 className="mt-2 font-serif text-4xl text-white">{copy.totalDonations}</h2>
            <p className="mt-8 text-5xl font-bold text-white drop-shadow-[0_10px_24px_rgba(120,53,15,0.35)]">
              {formatLocalizedCurrency(totalDonations, language)}
            </p>
            <p className="mt-3 max-w-md text-sm leading-7 text-orange-50/90">{copy.totalDonationsBody}</p>
          </div>
        </article>
      </section>

      <Card>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-700 dark:text-orange-300">{copy.history}</p>
            <h2 className="mt-2 font-serif text-4xl text-orange-950 dark:text-amber-50">{copy.donationHistory}</h2>
          </div>
          <span className="rounded-full border border-orange-200/80 bg-orange-50/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-orange-800 dark:border-orange-900/40 dark:bg-orange-950/18 dark:text-orange-200">
            {copy.entries(userDonations.length)}
          </span>
        </div>

        {userDonations.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">{copy.noDonations}</p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-orange-100 text-left text-[11px] uppercase tracking-[0.14em] text-orange-700 dark:border-orange-900/30 dark:text-orange-300">
                  <th className="px-3 py-3">{copy.date}</th>
                  <th className="px-3 py-3">{copy.type}</th>
                  <th className="px-3 py-3">{copy.purpose}</th>
                  <th className="px-3 py-3">{copy.status}</th>
                  <th className="px-3 py-3">{copy.amount}</th>
                </tr>
              </thead>
              <tbody>
                {userDonations.map((donation) => (
                  <tr key={donation.id} className="border-b border-orange-50/70 dark:border-orange-900/20">
                    <td className="px-3 py-3">{formatLocalizedDate(donation.date, language, { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td className="px-3 py-3">{translateValue(language, donation.type || '-')}</td>
                    <td className="px-3 py-3">{translateValue(language, donation.purpose)}</td>
                    <td className="px-3 py-3">{translateValue(language, donation.status)}</td>
                    <td className="px-3 py-3 font-semibold text-orange-800 dark:text-orange-200">
                      {formatLocalizedCurrency(donation.amount, language)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-700 dark:text-orange-300">{copy.readingShelf}</p>
          <h2 className="mt-2 font-serif text-3xl text-orange-950 dark:text-amber-50">{copy.savedEbooks}</h2>
          {savedBooks.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">{copy.noSavedBooks}</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {savedBooks.map((book) => (
                <li key={book.id} className="rounded-[22px] border border-orange-200/70 bg-white/72 px-4 py-3 dark:border-orange-900/30 dark:bg-white/5">
                  <p className="font-semibold text-zinc-800 dark:text-zinc-100">{book.title}</p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-300">{translateValue(language, book.author)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-700 dark:text-orange-300">{copy.watchTrail}</p>
          <h2 className="mt-2 font-serif text-3xl text-orange-950 dark:text-amber-50">{copy.watchHistory}</h2>
          {!currentUser?.watchHistory?.length ? (
            <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">{copy.noWatchHistory}</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {currentUser.watchHistory.slice(0, 8).map((entry) => (
                <li key={`${entry.videoId}-${entry.watchedAt}`} className="rounded-[22px] border border-orange-200/70 bg-white/72 px-4 py-3 dark:border-orange-900/30 dark:bg-white/5">
                  <p className="font-semibold text-zinc-800 dark:text-zinc-100">{entry.title}</p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-300">{copy.watchedOn} {formatLocalizedDate(entry.watchedAt, language, { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-700 dark:text-orange-300">{copy.receipts}</p>
        <h2 className="mt-2 font-serif text-3xl text-orange-950 dark:text-amber-50">{copy.receiptArchive}</h2>
        {sortedReceipts.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">{copy.noReceipts}</p>
        ) : (
          <ul className="mt-4 space-y-3 text-sm">
            {sortedReceipts.map((receipt) => {
              const receiptUrl = toAbsoluteUrl(receipt.receiptPath)

              return (
                <li key={receipt.transactionId} className="rounded-[22px] border border-orange-200/70 bg-white/72 px-4 py-4 dark:border-orange-900/30 dark:bg-white/5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-zinc-800 dark:text-zinc-100">{receipt.receiptNumber || receipt.transactionId}</p>
                      <p className="mt-1 text-zinc-600 dark:text-zinc-300">
                        {formatLocalizedDate(receipt.paidAt, language, { day: '2-digit', month: 'short', year: 'numeric' })} | {formatLocalizedCurrency(receipt.amount, language)}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.12em] text-orange-700 dark:text-orange-300">
                        {receiptForLabel} {translateValue(language, receipt.fundCategory || '-')}
                      </p>
                    </div>

                    {receiptUrl ? (
                      <div className="flex flex-wrap gap-2">
                        <a
                          href={receiptUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="focus-ring rounded-full bg-[linear-gradient(135deg,#c2410c,#f59e0b)] px-4 py-2 font-semibold text-white transition hover:brightness-105"
                        >
                          {viewReceiptLabel}
                        </a>
                        <a
                          href={receiptUrl}
                          download
                          className="focus-ring rounded-full border border-orange-300 px-4 py-2 font-semibold text-orange-900 transition hover:bg-orange-50 dark:border-orange-800 dark:text-orange-200 dark:hover:bg-orange-950/20"
                        >
                          {downloadPdfLabel}
                        </a>
                      </div>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}
