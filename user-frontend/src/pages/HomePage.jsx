import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toAbsoluteUrl } from '../api'
import { Card } from '../components/Card'
import { HeroMandirCarousel } from '../components/HeroMandirCarousel'
import { useApp } from '../context/AppContext'
import { loadHomeFallbackContent } from '../utils/contentFallbacks'
import {
  formatLocalizedCurrency,
  formatLocalizedDate,
  formatLocalizedNumber,
  pickByLanguage,
  translateValue,
} from '../utils/i18n'

const FALLBACK_BOOK_COVER = 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=900&q=80'
const FALLBACK_VIDEO_THUMBNAIL = 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=900&q=80'
const EMPTY_HOME_FALLBACK_CONTENT = Object.freeze({
  announcements: [],
  books: [],
  festivals: [],
  videos: [],
})

const TodaysTithiWidget = lazy(() => import('../components/TodaysTithiWidget').then((module) => ({ default: module.TodaysTithiWidget })))

function normalizeCategoryText(value, fallbackValue) {
  const text = String(value || '').trim()
  if (!text) return fallbackValue

  return text
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ')
}

function normalizeFeaturedBook(item, fallbackAuthor, fallbackCategory) {
  return {
    id: item.id || item.title,
    title: item.title || 'Untitled',
    author: item.author || item.createdBy || fallbackAuthor,
    category: item.category || (Array.isArray(item.tags) ? item.tags[0] : '') || fallbackCategory,
    description: item.description || '',
    coverUrl: toAbsoluteUrl(item.coverUrl || item.thumbnailUrl || ''),
  }
}

function normalizeFeaturedVideo(item, fallbackCategory) {
  return {
    id: item.id || item.title,
    title: item.title || 'Untitled',
    category: normalizeCategoryText(item.category || (Array.isArray(item.tags) ? item.tags[0] : ''), fallbackCategory),
    description: item.description || '',
    thumbnailUrl: toAbsoluteUrl(item.thumbnailUrl || item.coverUrl || ''),
  }
}

const HOME_COPY_EN = {
  eyebrow: 'Jain Dharma Digital Portal',
  heroTitle: 'A quieter, clearer home for darshan, seva, study, and sangh life.',
  heroDescription: 'brings today’s tithi snapshot, transparent giving, upcoming observances, and library access into one devotional experience built for families.',
  mandirNameFallback: 'Jain Mandir',
  addressFallback: 'Spiritual community platform',
  welcomeBack: (name) => `Welcome back, ${name}`,
  guestBadge: 'Open for every devotee',
  liveLoading: 'Refreshing live mandir data...',
  liveReady: 'Live mandir data ready',
  offerSeva: 'Donate for Seva',
  openCalendar: 'Open Tithi Darpan',
  joinSangh: 'Join The Sangh',
  openProfile: 'Open Profile',
  morningDarshan: 'Morning Darshan',
  eveningDarshan: 'Evening Darshan',
  studyCircle: 'Study and Pravachan',
  heroPanelEyebrow: 'Mandir Atmosphere',
  heroPanelBody: 'A cinematic darshan entry with today’s spiritual snapshot, temple timings, and a rotating mandir gallery.',
  totalDonations: 'Total Donations',
  donationEntries: 'Donation Entries',
  supporterFamilies: 'Supporter Families',
  festivalsAhead: 'Festivals Ahead',
  journeyEyebrow: 'Devotee Flow',
  journeyTitle: 'Everything important is arranged around the devotee journey, not around clutter.',
  journeyBody: 'Move from darshan to seva, from festival awareness to study, and from announcements to trust details without losing calm.',
  rhythmCards: [
    {
      label: 'Darshan Windows',
      value: '06:00 AM - 11:00 AM',
      text: 'Open the day with clear temple timings and a lighter spiritual rhythm.',
    },
    {
      label: 'Evening Flow',
      value: '05:00 PM - 09:00 PM',
      text: 'Return for aarti, prayer, pravachan, and family participation without hunting for updates.',
    },
    {
      label: 'Verified Giving',
      value: 'Transparent',
      text: 'Donation activity, registrations, and mandir credentials stay easy to understand and easy to verify.',
    },
  ],
  quickLinks: [
    {
      title: 'Donate',
      to: '/donate',
      description: 'Support temple seva with a cleaner and more transparent giving flow.',
    },
    {
      title: 'Tithi Darpan',
      to: '/calendar',
      description: 'Check tithi, fasting discipline, kalyanak, and upcoming observances in one place.',
    },
    {
      title: 'Ebooks',
      to: '/ebooks',
      description: 'Open scriptures, children’s reading, and thoughtful Jain study from the library shelf.',
    },
    {
      title: 'Videos',
      to: '/videos',
      description: 'Watch pravachan, bhajan, and darshan inside a calmer media experience.',
    },
  ],
  explore: 'Explore',
  calendarEyebrow: 'Festival Window',
  calendarTitle: 'Upcoming Jain observances and mandir events.',
  calendarBody: 'Track what is next, when it begins, and how each event fits into sangh activity.',
  loading: 'Loading...',
  mandirEvent: 'Mandir Event',
  mandirHall: 'Mandir Hall',
  feeLabel: 'Fee',
  updatesEyebrow: 'Updates',
  updatesTitle: 'Announcements and trust details in one place.',
  latestAnnouncements: 'Latest Announcements',
  homeLoadError: 'Could not load live homepage data:',
  retry: 'Retry',
  trustDesk: 'Mandir Trust Desk',
  trustDeskBody: 'Core trust credentials remain visible so devotees can give and participate with confidence.',
  panLabel: 'PAN',
  reg80GLabel: '80G Registration',
  trustNumberLabel: 'Trust Registration',
  notAvailable: 'Available soon',
  featuredEyebrow: 'Featured Shelf',
  featuredTitle: 'Study, listen, and return whenever the day allows.',
  featuredBody: 'The homepage now opens into live library highlights instead of forcing devotees to hunt across menus.',
  readingTitle: 'Reading Shelf',
  readingBody: 'Selected ebook entries from the digital Jain library.',
  videoTitle: 'Pravachan Picks',
  videoBody: 'Current spiritual video highlights and devotional media.',
  browseEbooks: 'Browse Ebooks',
  browseVideos: 'Browse Videos',
  read: 'Read',
  watch: 'Watch',
  defaultBookAuthor: 'Jain Mandir Library',
  defaultBookCategory: 'Scripture',
  defaultVideoCategory: 'Pravachan',
  communityEyebrow: 'Sangh Experience',
  communityTitle: 'A homepage that supports devotion, not distraction.',
  communityBody: 'Each section is meant to reduce friction: fewer dead ends, stronger hierarchy, more useful live context, and a warmer mandir-first atmosphere.',
  returnTitle: 'Your next seva step is already waiting.',
  returnBody: (name) => `${name}, your profile, donations, and devotional pathways stay one step away from the homepage.`,
  learnMore: 'About Mandir',
  communityCards: [
    {
      title: 'Clarity First',
      text: 'Important actions stay near the top so devotees can donate, read, or check tithi without searching.',
    },
    {
      title: 'Bilingual Access',
      text: 'English and Hindi views continue to work across rituals, library, and mandir updates.',
    },
    {
      title: 'Trust Signals',
      text: 'Mandir credentials and donation indicators stay visible to support confidence and transparency.',
    },
  ],
}

const HOME_COPY_HI = {
  eyebrow: 'जैन धर्म डिजिटल पोर्टल',
  heroTitle: 'दर्शन, सेवा, अध्ययन और संघ जीवन के लिए एक शांत और स्पष्ट होम पेज।',
  heroDescription: 'आज की तिथि झलक, पारदर्शी दान, आगामी पर्व, और लाइब्रेरी पहुँच को परिवारों के लिए बने एक भक्तिपूर्ण अनुभव में साथ लाता है।',
  mandirNameFallback: 'जैन मंदिर',
  addressFallback: 'आध्यात्मिक समुदाय मंच',
  welcomeBack: (name) => `फिर से स्वागत है, ${name}`,
  guestBadge: 'हर श्रद्धालु के लिए खुला',
  liveLoading: 'लाइव मंदिर डेटा रिफ्रेश हो रहा है...',
  liveReady: 'लाइव मंदिर डेटा उपलब्ध है',
  offerSeva: 'सेवा अर्पित करें',
  openCalendar: 'तिथि दर्पण खोलें',
  joinSangh: 'संघ से जुड़ें',
  openProfile: 'प्रोफ़ाइल खोलें',
  morningDarshan: 'प्रातः दर्शन',
  eveningDarshan: 'सायं दर्शन',
  studyCircle: 'अध्ययन और प्रवचन',
  heroPanelEyebrow: 'मंदिर वातावरण',
  heroPanelBody: 'आज की आध्यात्मिक झलक, मंदिर समय और घूमती हुई मंडिर गैलरी के साथ एक सिनेमैटिक दर्शन प्रवेश।',
  totalDonations: 'कुल दान',
  donationEntries: 'दान प्रविष्टियाँ',
  supporterFamilies: 'सहयोगी परिवार',
  festivalsAhead: 'आगामी पर्व',
  journeyEyebrow: 'श्रावक प्रवाह',
  journeyTitle: 'हर ज़रूरी काम को भक्त की यात्रा के अनुसार सजाया गया है, अव्यवस्था के अनुसार नहीं।',
  journeyBody: 'दर्शन से सेवा, पर्व जागरूकता से अध्ययन, और घोषणाओं से ट्रस्ट विवरण तक एक शांत प्रवाह बनाए रखें।',
  rhythmCards: [
    {
      label: 'दर्शन समय',
      value: '06:00 AM - 11:00 AM',
      text: 'दिन की शुरुआत स्पष्ट मंदिर समय और हल्के आध्यात्मिक प्रवाह के साथ करें।',
    },
    {
      label: 'सायं प्रवाह',
      value: '05:00 PM - 09:00 PM',
      text: 'आरती, प्रार्थना, प्रवचन और पारिवारिक सहभागिता के लिए बिना खोजे वापस आएँ।',
    },
    {
      label: 'पारदर्शी दान',
      value: 'विश्वसनीय',
      text: 'दान गतिविधि, पंजीकरण और मंदिर प्रमाण आसानी से समझने और जाँचने योग्य रहें।',
    },
  ],
  quickLinks: [
    {
      title: 'दान',
      to: '/donate',
      description: 'मंदिर सेवा के लिए अधिक साफ और पारदर्शी दान प्रवाह का उपयोग करें।',
    },
    {
      title: 'तिथि दर्पण',
      to: '/calendar',
      description: 'तिथि, उपवास, कल्याणक और आगामी पर्व एक ही स्थान पर देखें।',
    },
    {
      title: 'ईबुक्स',
      to: '/ebooks',
      description: 'लाइब्रेरी शेल्फ से शास्त्र, बाल-पाठन और विचारपूर्ण जैन अध्ययन खोलें।',
    },
    {
      title: 'वीडियो',
      to: '/videos',
      description: 'अधिक शांत मीडिया अनुभव में प्रवचन, भजन और दर्शन देखें।',
    },
  ],
  explore: 'देखें',
  calendarEyebrow: 'पर्व झरोखा',
  calendarTitle: 'आगामी जैन पर्व और मंदिर आयोजन।',
  calendarBody: 'आगे क्या है, कब शुरू होगा, और वह संघ गतिविधि से कैसे जुड़ता है, यह सब साथ में देखें।',
  loading: 'लोड हो रहा है...',
  mandirEvent: 'मंदिर आयोजन',
  mandirHall: 'मंदिर हॉल',
  feeLabel: 'शुल्क',
  updatesEyebrow: 'अपडेट्स',
  updatesTitle: 'घोषणाएँ और ट्रस्ट विवरण एक ही जगह।',
  latestAnnouncements: 'नवीनतम घोषणाएँ',
  homeLoadError: 'लाइव होमपेज डेटा लोड नहीं हो सका:',
  retry: 'फिर से प्रयास करें',
  trustDesk: 'मंदिर ट्रस्ट डेस्क',
  trustDeskBody: 'मुख्य ट्रस्ट विवरण दिखाई देते रहें ताकि श्रद्धालु विश्वास के साथ दान और सहभागिता कर सकें।',
  panLabel: 'पैन',
  reg80GLabel: '80G पंजीकरण',
  trustNumberLabel: 'ट्रस्ट पंजीकरण',
  notAvailable: 'शीघ्र उपलब्ध',
  featuredEyebrow: 'फ़ीचर्ड शेल्फ',
  featuredTitle: 'दिन में जब भी समय मिले, पढ़ें, सुनें और लौटें।',
  featuredBody: 'होमपेज अब मेन्यू में खोज कराने के बजाय सीधे लाइब्रेरी हाइलाइट्स तक पहुँच देता है।',
  readingTitle: 'पठन शेल्फ',
  readingBody: 'डिजिटल जैन लाइब्रेरी से चुनी हुई ईबुक प्रविष्टियाँ।',
  videoTitle: 'प्रवचन चयन',
  videoBody: 'वर्तमान आध्यात्मिक वीडियो और भक्तिमय मीडिया हाइलाइट्स।',
  browseEbooks: 'ईबुक्स देखें',
  browseVideos: 'वीडियो देखें',
  read: 'पढ़ें',
  watch: 'देखें',
  defaultBookAuthor: 'जैन मंदिर लाइब्रेरी',
  defaultBookCategory: 'Scripture',
  defaultVideoCategory: 'Pravachan',
  communityEyebrow: 'संघ अनुभव',
  communityTitle: 'ऐसा होमपेज जो भक्ति को सहारा दे, विचलन को नहीं।',
  communityBody: 'हर सेक्शन का उद्देश्य घर्षण कम करना है: कम भटकाव, बेहतर क्रम, अधिक उपयोगी लाइव संदर्भ, और अधिक गर्म मंदिर-केंद्रित वातावरण।',
  returnTitle: 'आपका अगला सेवा कदम पहले से यहीं है।',
  returnBody: (name) => `${name}, आपकी प्रोफ़ाइल, दान और भक्तिपथ होमपेज से बस एक कदम दूर रहते हैं।`,
  learnMore: 'मंदिर परिचय',
  communityCards: [
    {
      title: 'स्पष्टता पहले',
      text: 'मुख्य क्रियाएँ ऊपर रहती हैं ताकि श्रद्धालु बिना खोजे दान, पठन या तिथि देख सकें।',
    },
    {
      title: 'द्विभाषी पहुँच',
      text: 'अंग्रेज़ी और हिंदी दोनों दृश्य अनुष्ठान, लाइब्रेरी और मंदिर अपडेट्स में बने रहते हैं।',
    },
    {
      title: 'विश्वास संकेत',
      text: 'मंदिर प्रमाण और दान संकेत दिखाई देते रहते हैं ताकि पारदर्शिता और विश्वास बना रहे।',
    },
  ],
}

function TodaysTithiWidgetFallback({ copy }) {
  return (
    <Card className="border-orange-200/70 bg-[linear-gradient(135deg,rgba(255,251,235,0.92),rgba(255,237,213,0.82),rgba(255,247,237,0.92))] dark:border-orange-900/30 dark:bg-[linear-gradient(135deg,rgba(31,22,18,0.9),rgba(47,28,19,0.76),rgba(18,16,14,0.92))]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-700 dark:text-orange-300">{copy.loading}</p>
      <div className="mt-5 space-y-3">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={`tithi-widget-placeholder-${index + 1}`}
            className="h-14 animate-pulse rounded-[20px] border border-orange-200/70 bg-white/72 dark:border-orange-900/30 dark:bg-white/5"
          />
        ))}
      </div>
    </Card>
  )
}

export function HomePage() {
  const {
    currentUser,
    homeData,
    homeLoading,
    homeError,
    isAuthenticated,
    language,
    loadHomeData,
    mandirProfile,
  } = useApp()
  const [fallbackContent, setFallbackContent] = useState(EMPTY_HOME_FALLBACK_CONTENT)

  useEffect(() => {
    let active = true

    loadHomeFallbackContent()
      .then((content) => {
        if (active) setFallbackContent(content)
      })
      .catch(() => {
        if (active) setFallbackContent(EMPTY_HOME_FALLBACK_CONTENT)
      })

    return () => {
      active = false
    }
  }, [])

  const copy = pickByLanguage(language, {
    en: HOME_COPY_EN,
    hi: HOME_COPY_HI,
  })

  const mandirName = mandirProfile?.name || copy.mandirNameFallback
  const devoteeName = currentUser?.name?.trim().split(/\s+/)[0] || ''

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

    return [...fallbackContent.festivals]
      .sort((firstItem, secondItem) => new Date(firstItem.date) - new Date(secondItem.date))
      .slice(0, 4)
  }, [copy.feeLabel, copy.mandirHall, fallbackContent.festivals, homeData, language])

  const latestAnnouncements = useMemo(() => {
    const source = Array.isArray(homeData?.announcements) && homeData.announcements.length
      ? homeData.announcements
      : fallbackContent.announcements

    return [...source]
      .sort((firstItem, secondItem) => new Date(secondItem.date) - new Date(firstItem.date))
      .slice(0, 4)
  }, [fallbackContent.announcements, homeData])

  const donationSnapshot = useMemo(
    () => homeData?.donationSnapshot || {
      totalAmount: 0,
      donationCount: 0,
      supporterFamilies: 0,
    },
    [homeData],
  )

  const featuredBooks = useMemo(() => {
    const backendBooks = Array.isArray(homeData?.featured?.ebooks) ? homeData.featured.ebooks : []
    const source = backendBooks.length ? backendBooks : fallbackContent.books
    return source.slice(0, 2).map((item) => normalizeFeaturedBook(item, copy.defaultBookAuthor, copy.defaultBookCategory))
  }, [copy.defaultBookAuthor, copy.defaultBookCategory, fallbackContent.books, homeData])

  const featuredVideos = useMemo(() => {
    const backendVideos = Array.isArray(homeData?.featured?.videos) ? homeData.featured.videos : []
    const source = backendVideos.length ? backendVideos : fallbackContent.videos
    return source.slice(0, 2).map((item) => normalizeFeaturedVideo(item, copy.defaultVideoCategory))
  }, [copy.defaultVideoCategory, fallbackContent.videos, homeData])

  const heroFooterStats = [
    {
      label: copy.totalDonations,
      value: formatLocalizedCurrency(donationSnapshot.totalAmount, language),
    },
    {
      label: copy.festivalsAhead,
      value: formatLocalizedNumber(upcomingFestivals.length, language),
    },
  ]

  const trustSignals = [
    { label: copy.panLabel, value: mandirProfile?.pan || copy.notAvailable },
    { label: copy.reg80GLabel, value: mandirProfile?.reg80G || copy.notAvailable },
    { label: copy.trustNumberLabel, value: mandirProfile?.trustNumber || copy.notAvailable },
  ]

  return (
    <div className="space-y-8 md:space-y-10">
      <section>
        <HeroMandirCarousel
          homeData={homeData}
          mandirProfile={mandirProfile}
          language={language}
          className="rounded-[32px] border border-white/12 shadow-[0_32px_90px_rgba(0,0,0,0.24)] md:rounded-[44px]"
          minHeightClassName="min-h-[720px] lg:min-h-[calc(100vh-9rem)]"
          renderOverlay={({ slides, displayIndex, setActiveIndex, nextSlide, carouselCopy }) => {
            const activeSlide = slides[displayIndex] || null

            return (
              <div className="relative mx-auto grid min-h-[720px] max-w-[1380px] grid-rows-[1fr_auto] px-4 pb-8 pt-8 sm:px-6 sm:pb-10 sm:pt-10 lg:min-h-[calc(100vh-9rem)] lg:px-8 lg:pb-12">
                <div className="flex items-center py-10 lg:py-14">
                  <div className="max-w-4xl">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="inline-flex rounded-full border border-orange-200/18 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-100 backdrop-blur-sm">
                        {isAuthenticated && devoteeName ? copy.welcomeBack(devoteeName) : copy.guestBadge}
                      </span>
                      <span className="inline-flex rounded-full border border-white/16 bg-black/18 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/82 backdrop-blur-sm">
                        {mandirName}
                      </span>
                    </div>

                    <h1 className="hero-display mt-6 max-w-4xl text-5xl font-medium leading-[0.92] text-white sm:text-6xl xl:text-7xl">
                      {copy.heroTitle}
                    </h1>

                    <p className="mt-6 max-w-2xl text-sm leading-8 text-white/82 sm:text-base">
                      <span className="font-semibold text-white">{mandirName}</span> {copy.heroDescription}
                    </p>

                    <div className="mt-8 flex flex-wrap gap-3">
                      <Link
                        to="/donate"
                        className="focus-ring rounded-full bg-[linear-gradient(135deg,#c2410c,#f59e0b)] px-6 py-3 text-sm font-bold text-white shadow-[0_18px_34px_rgba(194,65,12,0.34)] transition hover:brightness-105"
                      >
                        {copy.offerSeva}
                      </Link>
                      <Link
                        to="/calendar"
                        className="focus-ring rounded-full border border-white/28 bg-white/16 px-6 py-3 text-sm font-bold !text-white shadow-[0_14px_28px_rgba(0,0,0,0.18)] backdrop-blur-md transition hover:bg-white/24"
                      >
                        {copy.openCalendar}
                      </Link>
                      <Link
                        to={isAuthenticated ? '/profile' : '/signup'}
                        className="focus-ring rounded-full border border-orange-200/34 bg-[linear-gradient(135deg,rgba(194,65,12,0.74),rgba(245,158,11,0.62))] px-6 py-3 text-sm font-bold !text-white shadow-[0_16px_30px_rgba(194,65,12,0.24)] transition hover:brightness-105"
                      >
                        {isAuthenticated ? copy.openProfile : copy.joinSangh}
                      </Link>
                    </div>

                    <div className="mt-8 flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-white/16 bg-black/18 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/82 backdrop-blur-sm">
                        {copy.morningDarshan} 6:00 AM - 11:00 AM
                      </span>
                      <span className="rounded-full border border-white/16 bg-black/18 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/82 backdrop-blur-sm">
                        {copy.eveningDarshan} 5:00 PM - 9:00 PM
                      </span>
                      <span className="rounded-full border border-white/16 bg-black/18 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/82 backdrop-blur-sm">
                        {copy.studyCircle}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-[32px] border border-white/12 bg-[linear-gradient(135deg,rgba(18,12,8,0.76),rgba(18,12,8,0.4),rgba(18,12,8,0.18))] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.18)] backdrop-blur-md sm:p-6">
                  <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-100/88">{copy.heroPanelEyebrow}</p>
                      <h2 className="mt-2 font-serif text-3xl text-white">{activeSlide?.title || mandirName}</h2>
                      <p className="mt-3 max-w-2xl text-sm leading-7 text-white/72">
                        {activeSlide?.description || copy.heroPanelBody}
                      </p>
                    </div>

                    <div className="flex flex-col gap-4 lg:items-end">
                      <div className="grid gap-3 sm:grid-cols-2 lg:w-[320px]">
                        {heroFooterStats.map((item) => (
                          <div
                            key={item.label}
                            className="rounded-[24px] border border-white/14 bg-black/16 px-4 py-4 backdrop-blur-sm"
                          >
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-100/76">{item.label}</p>
                            <p className="mt-2 font-serif text-3xl text-white">{item.value}</p>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <div className="flex items-center gap-2">
                          {slides.map((slide, index) => (
                            <button
                              key={`${slide.id || slide.title}-hero-dot`}
                              type="button"
                              onClick={() => setActiveIndex(index)}
                              className={`focus-ring h-2.5 rounded-full transition ${index === displayIndex ? 'w-10 bg-white' : 'w-2.5 bg-white/45 hover:bg-white/70'}`}
                              aria-label={carouselCopy.goToSlide(index)}
                            />
                          ))}
                        </div>

                        {slides.length > 1 && (
                          <button
                            type="button"
                            onClick={nextSlide}
                            className="focus-ring inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:bg-white/18"
                            aria-label={carouselCopy.nextSlide}
                          >
                            {carouselCopy.next}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          }}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)] xl:items-start">
        <div className="xl:sticky xl:top-28">
          <Suspense fallback={<TodaysTithiWidgetFallback copy={copy} />}>
            <TodaysTithiWidget />
          </Suspense>
        </div>

        <div className="grid gap-6">
          <Card className="overflow-hidden border-orange-200/70 bg-[linear-gradient(145deg,rgba(255,252,246,0.95),rgba(255,239,216,0.86),rgba(255,247,237,0.94))] dark:border-orange-900/30 dark:bg-[linear-gradient(145deg,rgba(28,22,18,0.95),rgba(47,28,19,0.82),rgba(18,16,14,0.94))]">
            <div className="relative">
              <div className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full bg-orange-300/24 blur-3xl dark:bg-orange-500/12" />
              <div className="pointer-events-none absolute bottom-4 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-amber-200/24 blur-3xl dark:bg-amber-300/8" />

              <div className="relative">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-700 dark:text-orange-300">{copy.journeyEyebrow}</p>
                <h2 className="mt-3 max-w-3xl font-serif text-4xl text-orange-950 dark:text-amber-50 sm:text-5xl">
                  {copy.journeyTitle}
                </h2>
                <p className="mt-4 max-w-3xl text-sm leading-8 text-zinc-600 dark:text-zinc-300 sm:text-base">
                  {copy.journeyBody}
                </p>

                <div className="mt-6 inline-flex rounded-full border border-orange-200/80 bg-white/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-800 dark:border-orange-900/40 dark:bg-white/5 dark:text-orange-200">
                  {mandirProfile?.address || copy.addressFallback}
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {copy.rhythmCards.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-[26px] border border-orange-200/80 bg-white/78 p-5 shadow-[0_14px_28px_rgba(194,65,12,0.08)] dark:border-orange-900/30 dark:bg-white/5"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-700 dark:text-orange-300">{item.label}</p>
                      <p className="mt-3 font-serif text-3xl text-orange-950 dark:text-amber-50">{item.value}</p>
                      <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {copy.quickLinks.map((item, index) => (
              <Card
                key={item.title}
                className="flex min-h-[220px] flex-col justify-between border-orange-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(255,244,231,0.88))] dark:border-orange-900/30 dark:bg-[linear-gradient(180deg,rgba(28,22,18,0.94),rgba(18,16,14,0.9))]"
              >
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-700 dark:text-orange-300">
                    0{index + 1}
                  </p>
                  <h2 className="mt-4 font-serif text-3xl text-orange-950 dark:text-amber-50">{item.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">{item.description}</p>
                </div>

                <Link
                  to={item.to}
                  className="focus-ring mt-6 inline-flex w-fit rounded-full border border-orange-200/80 bg-white/80 px-4 py-2.5 text-sm font-semibold text-orange-900 transition hover:bg-orange-50 dark:border-orange-900/40 dark:bg-white/5 dark:text-orange-200 dark:hover:bg-zinc-800"
                >
                  {copy.explore}
                </Link>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_380px]">
        <Card>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-700 dark:text-orange-300">{copy.calendarEyebrow}</p>
              <h2 className="mt-2 font-serif text-4xl text-orange-950 dark:text-amber-50">{copy.calendarTitle}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-600 dark:text-zinc-300">{copy.calendarBody}</p>
            </div>

            {homeLoading && (
              <p className="rounded-full border border-orange-200/70 bg-white/76 px-4 py-2 text-sm font-semibold text-zinc-600 dark:border-orange-900/30 dark:bg-white/5 dark:text-zinc-300">
                {copy.loading}
              </p>
            )}
          </div>

          <div className="mt-6 space-y-4">
            {upcomingFestivals.map((festival) => (
              <div
                key={festival.id}
                className="rounded-[28px] border border-orange-200/70 bg-white/76 p-4 dark:border-orange-900/30 dark:bg-white/5"
              >
                <div className="grid gap-4 md:grid-cols-[94px_minmax(0,1fr)] md:items-start">
                  <div className="rounded-[24px] bg-[linear-gradient(145deg,#fff5ea,#ffe3bf)] px-4 py-4 text-center shadow-[0_14px_28px_rgba(194,65,12,0.08)] dark:bg-[linear-gradient(145deg,rgba(52,30,17,0.98),rgba(31,22,18,0.95))]">
                    <p className="font-serif text-3xl text-orange-950 dark:text-amber-50">
                      {formatLocalizedDate(festival.date, language, { day: '2-digit' })}
                    </p>
                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-700 dark:text-orange-300">
                      {formatLocalizedDate(festival.date, language, { month: 'short' })}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                      {formatLocalizedDate(festival.date, language, { year: 'numeric' })}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-bold text-orange-950 dark:text-amber-50">{festival.name}</p>
                        <p className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-300">{festival.description}</p>
                      </div>

                      <span className="rounded-full border border-orange-200/80 bg-orange-50/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-orange-800 dark:border-orange-900/40 dark:bg-orange-950/18 dark:text-orange-200">
                        {copy.mandirEvent}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid gap-6">
          <Card className="h-full">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-700 dark:text-orange-300">{copy.updatesEyebrow}</p>
            <h2 className="mt-2 font-serif text-4xl text-orange-950 dark:text-amber-50">{copy.updatesTitle}</h2>

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

            {homeError && (
              <div className="mt-5 rounded-[24px] border border-red-200 bg-red-50/78 p-4 dark:border-red-900/35 dark:bg-red-950/25">
                <p className="text-sm font-semibold text-red-700 dark:text-red-200">
                  {copy.homeLoadError} {homeError}
                </p>
                <button
                  type="button"
                  onClick={() => loadHomeData({ force: true })}
                  className="focus-ring mt-3 rounded-full border border-red-300 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-red-800 dark:border-red-700 dark:text-red-200"
                >
                  {copy.retry}
                </button>
              </div>
            )}
          </Card>

          <Card className="border-orange-200/70 bg-[linear-gradient(145deg,rgba(255,251,240,0.95),rgba(255,239,214,0.88),rgba(255,247,237,0.92))] dark:border-orange-900/30 dark:bg-[linear-gradient(145deg,rgba(31,22,18,0.95),rgba(48,28,17,0.82),rgba(18,16,14,0.94))]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-700 dark:text-orange-300">{copy.trustDesk}</p>
            <h2 className="mt-2 font-serif text-3xl text-orange-950 dark:text-amber-50">{mandirName}</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">{copy.trustDeskBody}</p>

            <div className="mt-5 space-y-3">
              {trustSignals.map((item) => (
                <div
                  key={item.label}
                  className="rounded-[22px] border border-orange-200/70 bg-white/78 px-4 py-4 dark:border-orange-900/30 dark:bg-white/5"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-700 dark:text-orange-300">{item.label}</p>
                  <p className="mt-2 text-sm font-semibold text-zinc-800 dark:text-zinc-100">{item.value}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      <section className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden bg-[linear-gradient(180deg,#22140d_0%,#2e1a0f_42%,#1a110d_100%)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,201,138,0.16),transparent_28%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.16),transparent_30%)]" />

        <div className="relative mx-auto max-w-[1380px] px-4 py-14 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-200">{copy.featuredEyebrow}</p>
            <h2 className="mt-3 font-serif text-4xl text-white sm:text-5xl">{copy.featuredTitle}</h2>
            <p className="mt-4 text-sm leading-8 text-orange-50/78 sm:text-base">{copy.featuredBody}</p>
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-2">
            <div className="rounded-[34px] border border-white/12 bg-white/8 p-5 shadow-[0_28px_70px_rgba(0,0,0,0.24)] backdrop-blur-xl">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-200">{copy.readingTitle}</p>
                  <h3 className="mt-2 font-serif text-3xl text-white">{copy.readingBody}</h3>
                </div>

                <Link
                  to="/ebooks"
                  className="focus-ring rounded-full border border-white/28 bg-white/16 px-5 py-2.5 text-sm font-semibold !text-white shadow-[0_14px_28px_rgba(0,0,0,0.18)] backdrop-blur-md transition hover:bg-white/24"
                >
                  {copy.browseEbooks}
                </Link>
              </div>

              <div className="mt-5 space-y-4">
                {featuredBooks.map((book) => (
                  <div
                    key={book.id}
                    className="grid gap-4 rounded-[28px] border border-white/10 bg-black/18 p-3 sm:grid-cols-[112px_minmax(0,1fr)_auto] sm:items-center"
                  >
                    <img
                      src={book.coverUrl || FALLBACK_BOOK_COVER}
                      alt={`${book.title} cover`}
                      className="h-28 w-full rounded-[22px] object-cover sm:w-28"
                      loading="lazy"
                      decoding="async"
                    />

                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-200">
                        {translateValue(language, book.category || copy.defaultBookCategory)}
                      </p>
                      <h4 className="mt-2 text-xl font-semibold text-white">{book.title}</h4>
                      <p className="mt-1 text-sm font-medium text-orange-50/72">{book.author || copy.defaultBookAuthor}</p>
                      <p className="mt-2 text-sm leading-7 text-orange-50/72">{book.description}</p>
                    </div>

                    <Link
                      to="/ebooks"
                      className="focus-ring inline-flex w-fit rounded-full border border-orange-200/34 bg-[linear-gradient(135deg,rgba(194,65,12,0.74),rgba(245,158,11,0.62))] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] !text-white shadow-[0_14px_26px_rgba(194,65,12,0.2)] transition hover:brightness-105"
                    >
                      {copy.read}
                    </Link>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="rounded-[34px] border border-white/12 bg-white/8 p-5 shadow-[0_28px_70px_rgba(0,0,0,0.24)] backdrop-blur-xl">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-200">{copy.videoTitle}</p>
                  <h3 className="mt-2 font-serif text-3xl text-white">{copy.videoBody}</h3>
                </div>

                <Link
                  to="/videos"
                  className="focus-ring rounded-full border border-white/28 bg-white/16 px-5 py-2.5 text-sm font-semibold !text-white shadow-[0_14px_28px_rgba(0,0,0,0.18)] backdrop-blur-md transition hover:bg-white/24"
                >
                  {copy.browseVideos}
                </Link>
              </div>

              <div className="mt-5 space-y-4">
                {featuredVideos.map((video) => (
                  <div
                    key={video.id}
                    className="grid gap-4 rounded-[28px] border border-white/10 bg-black/18 p-3 sm:grid-cols-[128px_minmax(0,1fr)_auto] sm:items-center"
                  >
                    <img
                      src={video.thumbnailUrl || FALLBACK_VIDEO_THUMBNAIL}
                      alt={`${video.title} thumbnail`}
                      className="h-28 w-full rounded-[22px] object-cover sm:w-32"
                      loading="lazy"
                      decoding="async"
                    />

                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-200">
                        {translateValue(language, video.category || copy.defaultVideoCategory)}
                      </p>
                      <h4 className="mt-2 text-xl font-semibold text-white">{video.title}</h4>
                      <p className="mt-2 text-sm leading-7 text-orange-50/72">{video.description}</p>
                    </div>

                    <Link
                      to="/videos"
                      className="focus-ring inline-flex w-fit rounded-full border border-orange-200/34 bg-[linear-gradient(135deg,rgba(194,65,12,0.74),rgba(245,158,11,0.62))] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] !text-white shadow-[0_14px_26px_rgba(194,65,12,0.2)] transition hover:brightness-105"
                    >
                      {copy.watch}
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
        <Card className="overflow-hidden border-orange-200/70 bg-[linear-gradient(145deg,rgba(255,251,240,0.95),rgba(255,238,214,0.88),rgba(255,247,237,0.94))] dark:border-orange-900/30 dark:bg-[linear-gradient(145deg,rgba(31,22,18,0.95),rgba(47,28,19,0.82),rgba(18,16,14,0.94))]">
          <div className="relative">
            <div className="pointer-events-none absolute -left-12 top-8 h-40 w-40 rounded-full bg-orange-200/26 blur-3xl dark:bg-orange-600/10" />
            <div className="pointer-events-none absolute -right-8 bottom-0 h-44 w-44 rounded-full bg-amber-200/22 blur-3xl dark:bg-amber-300/8" />

            <div className="relative">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-700 dark:text-orange-300">{copy.communityEyebrow}</p>
              <h2 className="mt-3 font-serif text-4xl text-orange-950 dark:text-amber-50 sm:text-5xl">
                {isAuthenticated && devoteeName ? copy.returnTitle : copy.communityTitle}
              </h2>
              <p className="mt-4 text-sm leading-8 text-zinc-600 dark:text-zinc-300 sm:text-base">
                {isAuthenticated && devoteeName ? copy.returnBody(devoteeName) : copy.communityBody}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to={isAuthenticated ? '/profile' : '/signup'}
                  className="focus-ring rounded-full bg-[linear-gradient(135deg,#c2410c,#f59e0b)] px-6 py-3 text-sm font-bold text-white shadow-[0_16px_28px_rgba(194,65,12,0.24)] transition hover:brightness-105"
                >
                  {isAuthenticated ? copy.openProfile : copy.joinSangh}
                </Link>
                <Link
                  to="/about"
                  className="focus-ring rounded-full border border-orange-300/80 bg-white/78 px-6 py-3 text-sm font-bold text-orange-900 transition hover:bg-orange-50 dark:border-orange-900/40 dark:bg-white/5 dark:text-orange-200 dark:hover:bg-zinc-800"
                >
                  {copy.learnMore}
                </Link>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          {copy.communityCards.map((item, index) => (
            <Card key={item.title} className="flex h-full flex-col">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-700 dark:text-orange-300">
                0{index + 1}
              </p>
              <h2 className="mt-3 font-serif text-3xl text-orange-950 dark:text-amber-50">{item.title}</h2>
              <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">{item.text}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
