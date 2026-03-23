import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import announcements from '../data/announcements.json'
import fallbackFestivals from '../data/festivals.json'
import { Card } from '../components/Card'
import { HeroMandirCarousel } from '../components/HeroMandirCarousel'
import { TodaysTithiWidget } from '../components/TodaysTithiWidget'
import { useApp } from '../context/AppContext'
import {
  formatLocalizedCurrency,
  formatLocalizedDate,
  formatLocalizedNumber,
  pickByLanguage,
} from '../utils/i18n'

export function HomePage() {
  const { homeData, homeLoading, homeError, loadHomeData, mandirProfile, language } = useApp()

  const copy = pickByLanguage(language, {
    en: {
      eyebrow: 'Jain Dharma Digital Portal',
      heroTitle: 'A serene digital mandir, designed with devotion instead of clutter.',
      heroDescription: 'brings darshan, seva, tithi awareness, donations, teachings, and sangh life into one warm and elevated experience.',
      addressFallback: 'Spiritual community platform',
      offerSeva: 'Offer Seva',
      openDarpan: 'Open Tithi Darpan',
      totalDonations: 'Total Donations',
      donationEntries: 'Donation Entries',
      supporterFamilies: 'Supporter Families',
      dailyRhythm: 'Daily Rhythm',
      dailyRhythmTitle: 'Simple, peaceful access to darshan, seva, and sangh updates.',
      dailyRhythmBody: 'The home page is intentionally clean and free from decorative monument imagery, keeping the focus on spiritual tools and meaningful content.',
      morningDarshan: 'Morning Darshan',
      eveningDarshan: 'Evening Darshan',
      homeLoadError: 'Could not load live homepage data:',
      retry: 'Retry',
      quickLinks: [
        { title: 'Donate', to: '/donate', description: 'Support temple seva and community upliftment with a premium payment flow.' },
        { title: 'Ebooks', to: '/ebooks', description: 'Browse scriptures, devotionals, and thoughtful Jain reading experiences.' },
        { title: 'Videos', to: '/videos', description: 'Watch pravachan, bhakti, and curated spiritual media with a cleaner player flow.' },
        { title: 'Calendar', to: '/calendar', description: 'Track tithi, kalyanak, fasting, and observances in a richer darpan interface.' },
      ],
      explore: 'Explore',
      upcoming: 'Upcoming',
      upcomingTitle: 'Upcoming Jain Festivals',
      loading: 'Loading...',
      mandirEvent: 'Mandir Event',
      updates: 'Updates',
      latestAnnouncements: 'Latest Announcements',
      mandirHall: 'Mandir Hall',
      feeLabel: 'Fee',
    },
    hi: {
      eyebrow: 'जैन धर्म डिजिटल पोर्टल',
      heroTitle: 'एक शांत डिजिटल मंदिर, जो सजावट नहीं बल्कि भक्ति के साथ बनाया गया है।',
      heroDescription: 'दर्शन, सेवा, तिथि जागरूकता, दान, शिक्षाएँ और संघ जीवन को एक ही सहज अनुभव में साथ लाता है।',
      addressFallback: 'आध्यात्मिक समुदाय मंच',
      offerSeva: 'सेवा अर्पित करें',
      openDarpan: 'तिथि दर्पण खोलें',
      totalDonations: 'कुल दान',
      donationEntries: 'दान प्रविष्टियाँ',
      supporterFamilies: 'सहयोगी परिवार',
      dailyRhythm: 'दैनिक लय',
      dailyRhythmTitle: 'दर्शन, सेवा और संघ अपडेट्स तक सरल और शांत पहुँच।',
      dailyRhythmBody: 'होम पेज को जानबूझकर साफ और सरल रखा गया है, ताकि ध्यान सीधे आध्यात्मिक टूल्स और सार्थक सामग्री पर रहे।',
      morningDarshan: 'प्रातः दर्शन',
      eveningDarshan: 'सायं दर्शन',
      homeLoadError: 'लाइव होमपेज डेटा लोड नहीं हो सका:',
      retry: 'फिर से प्रयास करें',
      quickLinks: [
        { title: 'दान', to: '/donate', description: 'मंदिर सेवा और सामुदायिक उत्थान के लिए सहज भुगतान प्रवाह से सहयोग करें।' },
        { title: 'ईबुक्स', to: '/ebooks', description: 'शास्त्र, भक्ति पाठ और विचारपूर्ण जैन अध्ययन सामग्री देखें।' },
        { title: 'वीडियो', to: '/videos', description: 'अधिक साफ प्लेयर अनुभव में प्रवचन, भक्ति और आध्यात्मिक मीडिया देखें।' },
        { title: 'कैलेंडर', to: '/calendar', description: 'तिथि, कल्याणक, उपवास और पर्वों को समृद्ध दर्पण इंटरफेस में ट्रैक करें।' },
      ],
      explore: 'देखें',
      upcoming: 'आगामी',
      upcomingTitle: 'आगामी जैन पर्व',
      loading: 'लोड हो रहा है...',
      mandirEvent: 'मंदिर आयोजन',
      updates: 'अपडेट्स',
      latestAnnouncements: 'नवीनतम घोषणाएँ',
      mandirHall: 'मंदिर हॉल',
      feeLabel: 'शुल्क',
    },
  })

  const upcomingFestivals = useMemo(() => {
    const fromBackend = Array.isArray(homeData?.upcomingEvents)
      ? homeData.upcomingEvents.map((event) => ({
        id: event.id,
        name: event.name,
        date: event.date,
        description: `${event.hall || copy.mandirHall}${Number(event.feePerFamily) ? ` | ${copy.feeLabel}: ${formatLocalizedCurrency(event.feePerFamily, language)}` : ''}`,
      }))
      : []
    if (fromBackend.length) return fromBackend.slice(0, 4)
    return [...fallbackFestivals].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 4)
  }, [copy.feeLabel, copy.mandirHall, homeData, language])

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
      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="relative overflow-hidden rounded-[36px] border border-orange-200/70 bg-[linear-gradient(135deg,rgba(255,252,247,0.92),rgba(255,237,213,0.86),rgba(255,249,242,0.94))] px-6 py-8 shadow-[0_28px_70px_rgba(132,71,21,0.12)] dark:border-orange-900/30 dark:bg-[linear-gradient(135deg,rgba(31,22,18,0.92),rgba(48,28,17,0.78),rgba(20,16,14,0.94))] sm:px-8 sm:py-9">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-orange-300/28 blur-3xl dark:bg-orange-500/14" />
          <div className="pointer-events-none absolute bottom-0 right-1/4 h-40 w-40 rounded-full bg-amber-200/24 blur-3xl dark:bg-amber-300/10" />

          <div className="relative">
            <p className="inline-flex rounded-full border border-orange-200/80 bg-white/82 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-800 dark:border-orange-900/40 dark:bg-white/5 dark:text-orange-300">
              {copy.eyebrow}
            </p>
            <h1 className="hero-display mt-5 max-w-3xl text-5xl font-medium leading-[0.92] text-orange-950 dark:text-amber-50 sm:text-6xl">
              {copy.heroTitle}
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-8 text-zinc-600 dark:text-zinc-300 sm:text-base">
              {mandirProfile?.name || (language === 'hi' ? 'जैन मंदिर' : 'Jain Mandir')} {copy.heroDescription}
            </p>
            <p className="mt-3 text-sm font-semibold uppercase tracking-[0.18em] text-orange-700 dark:text-orange-300">
              {mandirProfile?.address || copy.addressFallback}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/donate"
                className="focus-ring rounded-full bg-[linear-gradient(135deg,#c2410c,#f59e0b)] px-6 py-3 text-sm font-bold text-white shadow-[0_16px_28px_rgba(194,65,12,0.28)] transition hover:brightness-105"
              >
                {copy.offerSeva}
              </Link>
              <Link
                to="/calendar"
                className="focus-ring rounded-full border border-orange-300/80 bg-white/76 px-6 py-3 text-sm font-bold text-orange-900 transition hover:bg-orange-50 dark:border-orange-800 dark:bg-zinc-900/55 dark:text-orange-200 dark:hover:bg-zinc-800"
              >
                {copy.openDarpan}
              </Link>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <Card className="border-white/70 bg-white/74 p-5 dark:bg-white/5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-700 dark:text-orange-300">{copy.totalDonations}</p>
                <p className="mt-3 font-serif text-4xl text-orange-950 dark:text-amber-50">{formatLocalizedCurrency(donationSnapshot.totalAmount, language)}</p>
              </Card>
              <Card className="border-white/70 bg-white/74 p-5 dark:bg-white/5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-700 dark:text-orange-300">{copy.donationEntries}</p>
                <p className="mt-3 font-serif text-4xl text-orange-950 dark:text-amber-50">{formatLocalizedNumber(donationSnapshot.donationCount, language)}</p>
              </Card>
              <Card className="border-white/70 bg-white/74 p-5 dark:bg-white/5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-700 dark:text-orange-300">{copy.supporterFamilies}</p>
                <p className="mt-3 font-serif text-4xl text-orange-950 dark:text-amber-50">{formatLocalizedNumber(donationSnapshot.supporterFamilies, language)}</p>
              </Card>
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          <HeroMandirCarousel homeData={homeData} mandirProfile={mandirProfile} language={language} />
          <TodaysTithiWidget />
        </div>
      </section>

      {homeError && (
        <Card className="border-red-200 bg-red-50/78 dark:border-red-900/35 dark:bg-red-950/25">
          <p className="text-sm font-semibold text-red-700 dark:text-red-200">
            {copy.homeLoadError} {homeError}
          </p>
          <button
            type="button"
            onClick={loadHomeData}
            className="focus-ring mt-3 rounded-full border border-red-300 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-red-800 dark:border-red-700 dark:text-red-200"
          >
            {copy.retry}
          </button>
        </Card>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {copy.quickLinks.map((item, index) => (
          <Card key={item.title} className="flex min-h-[220px] flex-col justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-700 dark:text-orange-300">
                0{index + 1}
              </p>
              <h2 className="mt-4 font-serif text-3xl text-orange-950 dark:text-amber-50">{item.title}</h2>
              <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">{item.description}</p>
            </div>
            <Link
              to={item.to}
              className="focus-ring mt-6 inline-flex w-fit rounded-full border border-orange-200/80 bg-white/76 px-4 py-2.5 text-sm font-semibold text-orange-900 transition hover:bg-orange-50 dark:border-orange-900/40 dark:bg-zinc-900/55 dark:text-orange-200 dark:hover:bg-zinc-800"
            >
              {copy.explore}
            </Link>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-700 dark:text-orange-300">{copy.upcoming}</p>
              <h2 className="mt-2 font-serif text-3xl text-orange-950 dark:text-amber-50">{copy.upcomingTitle}</h2>
            </div>
            {homeLoading && <p className="text-sm text-zinc-500 dark:text-zinc-400">{copy.loading}</p>}
          </div>

          <div className="mt-5 space-y-3">
            {upcomingFestivals.map((festival) => (
              <div
                key={festival.id}
                className="rounded-[24px] border border-orange-200/70 bg-white/72 px-5 py-4 dark:border-orange-900/30 dark:bg-white/5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-orange-950 dark:text-amber-50">{festival.name}</p>
                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-700 dark:text-orange-300">
                      {formatLocalizedDate(festival.date, language, {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <span className="rounded-full border border-orange-200/80 bg-orange-50/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-orange-800 dark:border-orange-900/40 dark:bg-orange-950/18 dark:text-orange-200">
                    {copy.mandirEvent}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">{festival.description}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-700 dark:text-orange-300">{copy.updates}</p>
          <h2 className="mt-2 font-serif text-3xl text-orange-950 dark:text-amber-50">{copy.latestAnnouncements}</h2>
          <div className="mt-5 space-y-3">
            {latestAnnouncements.map((item) => (
              <div
                key={item.id}
                className="rounded-[24px] border border-orange-200/70 bg-white/72 px-5 py-4 dark:border-orange-900/30 dark:bg-white/5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-bold text-orange-950 dark:text-amber-50">{item.title}</p>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-700 dark:text-orange-300">
                    {formatLocalizedDate(item.date, language, {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">{item.message}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  )
}
