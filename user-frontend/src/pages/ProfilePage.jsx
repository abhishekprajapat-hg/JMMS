import { useEffect, useMemo, useState } from 'react'
import { toAbsoluteUrl } from '../api'
import { Card } from '../components/Card'
import { Modal } from '../components/Modal'
import { PageHeader } from '../components/PageHeader'
import { useApp } from '../context/AppContext'
import {
  formatLocalizedCurrency,
  formatLocalizedDate,
  formatLocalizedNumber,
  pickByLanguage,
  translateValue,
} from '../utils/i18n'

const upiAppOptions = [
  { id: 'any', label: 'Any UPI App', packageName: '' },
  { id: 'gpay', label: 'Google Pay', packageName: 'com.google.android.apps.nbu.paisa.user' },
  { id: 'phonepe', label: 'PhonePe', packageName: 'com.phonepe.app' },
  { id: 'paytm', label: 'Paytm', packageName: 'net.one97.paytm' },
  { id: 'bhim', label: 'BHIM', packageName: 'in.org.npci.upiapp' },
]

function getPlatformFlags() {
  if (typeof navigator === 'undefined') {
    return {
      isAndroid: false,
      isDesktop: true,
    }
  }
  const userAgent = String(navigator.userAgent || '').toLowerCase()
  const isAndroid = userAgent.includes('android')
  const isIos = /iphone|ipad|ipod/.test(userAgent)
  return {
    isAndroid,
    isDesktop: !isAndroid && !isIos,
  }
}

function buildUpiPayLink(upiLink, packageName, { isAndroid }) {
  if (!upiLink) return ''
  if (!packageName || !isAndroid) return upiLink
  const separatorIndex = upiLink.indexOf('?')
  if (separatorIndex < 0) return upiLink
  const query = upiLink.slice(separatorIndex + 1)
  return `intent://pay?${query}#Intent;scheme=upi;package=${packageName};end`
}

export function ProfilePage() {
  const {
    currentUser,
    userData,
    userDonations,
    totalDonations,
    addDonation,
    fetchLibrary,
    language,
    refreshUserData,
    fundCategories,
    pendingPaymentIntents,
    createEventPaymentIntent,
    registerForEvent,
    submitDonationProof,
    working,
  } = useApp()
  const [ebookCatalog, setEbookCatalog] = useState([])
  const [latestEventPayment, setLatestEventPayment] = useState(null)
  const [isEventPaymentOpen, setIsEventPaymentOpen] = useState(false)
  const [eventPaymentError, setEventPaymentError] = useState('')
  const [eventPaymentSuccess, setEventPaymentSuccess] = useState('')
  const [profileDonationError, setProfileDonationError] = useState('')
  const [profileDonationForm, setProfileDonationForm] = useState({
    amount: '',
    purpose: '',
    paymentMethod: 'UPI',
  })
  const [latestProfileDonation, setLatestProfileDonation] = useState(null)
  const [isProfileDonationOpen, setIsProfileDonationOpen] = useState(false)
  const [profileProofError, setProfileProofError] = useState('')
  const [profileProofSuccess, setProfileProofSuccess] = useState('')
  const [profileProofForm, setProfileProofForm] = useState({
    payerName: '',
    payerUtr: '',
  })
  const [eventRegisterError, setEventRegisterError] = useState('')
  const [eventRegisterSuccess, setEventRegisterSuccess] = useState('')
  const [eventSeatsById, setEventSeatsById] = useState({})
  const [eventPaymentForm, setEventPaymentForm] = useState({
    payerName: '',
    payerUtr: '',
  })

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
      quickDonation: 'Quick Donation Payment',
      donationAmount: 'Donation Amount (INR)',
      paymentMethod: 'Payment Method',
      createPaymentIntent: 'Create Payment Intent',
      donationIntentCreated: 'Donation payment intent created for',
      completeDonationPayment: 'Complete Donation Payment',
      completeDonation: 'Complete Your Donation',
      submittedDonation: 'Donation Submitted',
      noPurposeFallback: 'General Fund',
      amountError: 'Please enter a valid donation amount.',
      purposeError: 'Please choose a valid purpose.',
      donationFailed: 'Unable to create donation payment intent right now.',
      date: 'Date',
      type: 'Type',
      purpose: 'Purpose',
      status: 'Status',
      amount: 'Amount',
      events: 'Events',
      eventCatalog: 'Mandir event catalog',
      noEvents: 'No events published yet.',
      hall: 'Hall',
      fee: 'Fee',
      seats: 'Seats',
      registered: 'Registered',
      approval: 'Approval',
      registerEvent: 'Register',
      seatsToRegister: 'Seats to register',
      seatsRequiredError: 'Please enter a valid seat count.',
      seatsAvailabilityError: 'Requested seats are not available for this event.',
      registerSuccessPaid: 'Registration created. Complete payment from My Event Registrations.',
      registerSuccessFree: 'Registration created and approved.',
      registerFailed: 'Unable to register for this event right now.',
      alreadyRegisteredEvent: 'Already registered',
      soldOut: 'Sold out',
      registrations: 'My Event Registrations',
      noRegistrations: 'No event registrations found for your family yet.',
      payNow: 'Pay Now',
      alreadyPaid: 'Paid',
      paymentInProgress: 'Payment Pending',
      notRequired: 'Not required',
      eventPaymentIntentCreated: 'Event payment intent created for',
      completeEventPayment: 'Complete Event Payment',
      upiPayment: 'UPI Payment',
      chooseUpi: 'Choose a UPI app below to continue payment.',
      scanQr: 'Scan QR from your UPI app',
      bankTransfer: 'Bank Transfer',
      submitProofTitle: 'Submit Proof of Payment (Required)',
      submitProofBody: 'After payment, enter your payer name and UTR / transaction reference.',
      payerName: 'Payer Name',
      payerNamePlaceholder: 'Name used during payment',
      payerUtr: 'UTR / Txn ID',
      payerUtrPlaceholder: 'Enter UTR or reference number',
      submitProof: 'Submit Proof',
      close: 'Close',
      payerNameError: 'Please enter payer name.',
      payerUtrError: 'Please enter a valid UTR / Transaction ID (minimum 8 characters).',
      proofFailed: 'Unable to submit payment proof right now.',
      proofSuccess: 'Proof submitted successfully. Team will verify your payment shortly.',
      upiLink: 'UPI Link',
      ac: 'A/C',
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
      eyebrow: '????????',
      title: '?????????? ????????',
      description: '???? ???????? ???????, ??? ???, ??????, ??? ???? ??? ?????? ?? ??? ??????? ?? ?????? ???????? ????',
      profileDetails: '???????? ?????',
      devoteeAccount: '?????? ????',
      email: '????',
      whatsapp: 'WhatsApp',
      familyId: '?????? ID',
      gotra: '?????',
      mandirId: '????? ID',
      lifetimeSeva: '????? ????',
      totalDonations: '??? ???',
      totalDonationsBody: '????? ?????????? ?? ??? ???? ?????? ??? ?? ?????? ?? ????????????? ????? ?? ?? ??? ??????',
      history: '??????',
      donationHistory: '??? ??????',
      entries: (count) => `${formatLocalizedNumber(count, language)} ????????????`,
      noDonations: '??? ?? ??? ??? ???? ???? ???',
      quickDonation: 'Quick Donation Payment',
      donationAmount: 'Donation Amount (INR)',
      paymentMethod: 'Payment Method',
      createPaymentIntent: 'Create Payment Intent',
      donationIntentCreated: 'Donation payment intent created for',
      completeDonationPayment: 'Complete Donation Payment',
      completeDonation: 'Complete Your Donation',
      submittedDonation: 'Donation Submitted',
      noPurposeFallback: 'General Fund',
      amountError: 'Please enter a valid donation amount.',
      purposeError: 'Please choose a valid purpose.',
      donationFailed: 'Unable to create donation payment intent right now.',
      date: '?????',
      type: '??????',
      purpose: '????????',
      status: '??????',
      amount: '????',
      events: 'इवेंट्स',
      eventCatalog: 'मंदिर इवेंट सूची',
      noEvents: 'अभी तक कोई इवेंट नहीं है।',
      hall: 'हॉल',
      fee: 'शुल्क',
      seats: 'सीट्स',
      registered: 'रजिस्ट्रेशन',
      approval: 'स्वीकृति',
      registerEvent: 'रजिस्टर करें',
      seatsToRegister: 'रजिस्टर सीटें',
      seatsRequiredError: 'कृपया सही सीट संख्या दर्ज करें।',
      seatsAvailabilityError: 'इतनी सीटें उपलब्ध नहीं हैं।',
      registerSuccessPaid: 'रजिस्ट्रेशन बन गया। अब भुगतान पूरा करें।',
      registerSuccessFree: 'रजिस्ट्रेशन सफल और स्वीकृत हो गया।',
      registerFailed: 'अभी इवेंट रजिस्ट्रेशन नहीं हो सका।',
      alreadyRegisteredEvent: 'पहले से रजिस्टर्ड',
      soldOut: 'सीटें समाप्त',
      registrations: 'मेरे इवेंट रजिस्ट्रेशन',
      noRegistrations: 'आपके परिवार के लिए कोई इवेंट रजिस्ट्रेशन नहीं मिला।',
      payNow: 'अभी भुगतान करें',
      alreadyPaid: 'भुगतान हो चुका',
      paymentInProgress: 'भुगतान लंबित',
      notRequired: 'आवश्यक नहीं',
      eventPaymentIntentCreated: 'इवेंट पेमेंट इंटेंट बनाया गया:',
      completeEventPayment: 'इवेंट भुगतान पूरा करें',
      upiPayment: 'UPI भुगतान',
      chooseUpi: 'भुगतान जारी रखने के लिए UPI ऐप चुनें।',
      scanQr: 'अपने UPI ऐप से QR स्कैन करें',
      bankTransfer: 'बैंक ट्रांसफर',
      submitProofTitle: 'पेमेंट प्रूफ जमा करें (आवश्यक)',
      submitProofBody: 'भुगतान के बाद payer name और UTR/reference नंबर भरें।',
      payerName: 'Payer Name',
      payerNamePlaceholder: 'भुगतान में इस्तेमाल नाम',
      payerUtr: 'UTR / Txn ID',
      payerUtrPlaceholder: 'UTR या reference number दर्ज करें',
      submitProof: 'प्रूफ जमा करें',
      close: 'बंद करें',
      payerNameError: 'कृपया payer name दर्ज करें।',
      payerUtrError: 'कृपया सही UTR/Transaction ID दर्ज करें (कम से कम 8 अक्षर)।',
      proofFailed: 'अभी पेमेंट प्रूफ जमा नहीं हो सका।',
      proofSuccess: 'प्रूफ सफलतापूर्वक जमा हो गया।',
      upiLink: 'UPI लिंक',
      ac: 'खाता',
      readingShelf: '?????? ?????',
      savedEbooks: '??? ?? ?? ??????',
      noSavedBooks: '??? ?? ??? ??? ?? ?? ????? ???? ???',
      watchTrail: '??? ?????',
      watchHistory: '?????? ??? ??????',
      noWatchHistory: '??? ?? ??? ??? ?????? ???? ???',
      watchedOn: '???? ???',
      receipts: '??????',
      receiptArchive: '???? ??????',
      noReceipts: '??? ?? ??? ???? ????????? ?????? ???? ???',
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

  useEffect(() => {
    refreshUserData(undefined, { silent: true })
  }, [refreshUserData])

  const savedBooks = useMemo(
    () => ebookCatalog.filter((book) => currentUser?.savedEbookIds.includes(book.id)),
    [ebookCatalog, currentUser],
  )

  const platformFlags = useMemo(() => getPlatformFlags(), [])
  const family = userData?.family || userData?.summary?.family || null
  const events = useMemo(() => userData?.summary?.events || [], [userData])
  const eventRegistrations = useMemo(() => userData?.summary?.eventRegistrations || [], [userData])
  const receipts = useMemo(() => userData?.summary?.receipts || [], [userData])
  const receiptForLabel = language === 'hi' ? '\u0930\u0938\u0940\u0926 \u0915\u0947 \u0932\u093f\u090f' : 'Receipt for'
  const viewReceiptLabel = language === 'hi' ? '\u0930\u0938\u0940\u0926 \u0926\u0947\u0916\u0947\u0902' : 'View Receipt'
  const downloadPdfLabel = language === 'hi' ? '\u092a\u0940\u0921\u0940\u090f\u092b \u0921\u093e\u0909\u0928\u0932\u094b\u0921 \u0915\u0930\u0947\u0902' : 'Download PDF'
  const sortedReceipts = useMemo(
    () => [...receipts].sort((left, right) => String(right.paidAt || '').localeCompare(String(left.paidAt || ''))),
    [receipts],
  )
  const sortedEvents = useMemo(
    () => [...events].sort((left, right) => String(left.date || '').localeCompare(String(right.date || ''))),
    [events],
  )
  const sortedRegistrations = useMemo(
    () =>
      [...eventRegistrations].sort((left, right) =>
        String(right.eventDate || right.registeredAt || '').localeCompare(String(left.eventDate || left.registeredAt || '')),
      ),
    [eventRegistrations],
  )
  const registrationByEventId = useMemo(
    () => Object.fromEntries((eventRegistrations || []).map((registration) => [registration.eventId, registration])),
    [eventRegistrations],
  )
  const pendingIntentLookup = useMemo(
    () => Object.fromEntries((pendingPaymentIntents || []).map((intent) => [intent.linkedTransactionId || '', intent.status || ''])),
    [pendingPaymentIntents],
  )
  const upiPaymentOptions = useMemo(() => {
    const upiLink = latestEventPayment?.instructions?.upiLink || ''
    if (!upiLink) return []
    return upiAppOptions.map((option) => ({
      ...option,
      href: buildUpiPayLink(upiLink, option.packageName, platformFlags),
    }))
  }, [latestEventPayment, platformFlags])
  const profileDonationUpiOptions = useMemo(() => {
    const upiLink = latestProfileDonation?.instructions?.upiLink || ''
    if (!upiLink) return []
    return upiAppOptions.map((option) => ({
      ...option,
      href: buildUpiPayLink(upiLink, option.packageName, platformFlags),
    }))
  }, [latestProfileDonation, platformFlags])
  const selectedProfileDonationPurpose = profileDonationForm.purpose || fundCategories?.[0] || copy.noPurposeFallback

  async function handleRegisterEvent(event) {
    if (!event?.id) return
    setEventRegisterError('')
    setEventRegisterSuccess('')

    const seatsRequested = Number(eventSeatsById[event.id] || 1)
    if (!Number.isInteger(seatsRequested) || seatsRequested < 1) {
      setEventRegisterError(copy.seatsRequiredError)
      return
    }
    if (seatsRequested > Number(event.seatsAvailable || 0)) {
      setEventRegisterError(copy.seatsAvailabilityError)
      return
    }

    const result = await registerForEvent({
      eventId: event.id,
      seats: seatsRequested,
      notes: `Self registration from profile for ${event.name || event.id}`,
    })
    if (!result.ok) {
      setEventRegisterError(result.message || copy.registerFailed)
      return
    }

    setEventSeatsById((current) => ({ ...current, [event.id]: 1 }))
    setEventRegisterSuccess(result.transaction ? copy.registerSuccessPaid : copy.registerSuccessFree)
  }

  async function handleCreateProfileDonation() {
    setProfileDonationError('')
    const amount = Number(profileDonationForm.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      setProfileDonationError(copy.amountError)
      return
    }
    const purpose = String(selectedProfileDonationPurpose || '').trim()
    if (!purpose) {
      setProfileDonationError(copy.purposeError)
      return
    }

    const result = await addDonation({
      amount,
      purpose,
      paymentMethod: profileDonationForm.paymentMethod,
    })
    if (!result.ok) {
      setProfileDonationError(result.message || copy.donationFailed)
      return
    }

    setLatestProfileDonation(result.donation || null)
    setProfileProofForm({
      payerName: currentUser?.name || '',
      payerUtr: '',
    })
    setProfileProofError('')
    setProfileProofSuccess('')
    setIsProfileDonationOpen(true)
  }

  async function handleSubmitProfileDonationProof(event) {
    event.preventDefault()
    if (!latestProfileDonation?.id) return

    const payerName = String(profileProofForm.payerName || '').trim()
    const payerUtr = String(profileProofForm.payerUtr || '').trim()
    setProfileProofError('')
    setProfileProofSuccess('')

    if (!payerName) {
      setProfileProofError(copy.payerNameError)
      return
    }
    if (payerUtr.length < 8) {
      setProfileProofError(copy.payerUtrError)
      return
    }

    const result = await submitDonationProof({
      paymentId: latestProfileDonation.id,
      payerName,
      payerUtr,
    })
    if (!result.ok) {
      setProfileProofError(result.message || copy.proofFailed)
      return
    }

    setLatestProfileDonation((current) => (current ? { ...current, proofSubmitted: true } : current))
    setProfileProofSuccess(copy.proofSuccess)
  }

  async function handleStartEventPayment(registration) {
    if (!registration?.linkedTransaction?.id) return
    setEventPaymentError('')
    setEventPaymentSuccess('')

    const result = await createEventPaymentIntent({
      linkedTransactionId: registration.linkedTransaction.id,
      note: `Event payment: ${registration.eventName || registration.eventId || registration.id}`,
    })
    if (!result.ok) {
      setEventPaymentError(result.message || copy.proofFailed)
      return
    }

    setLatestEventPayment({
      ...result.donation,
      registration,
    })
    setEventPaymentForm({
      payerName: currentUser?.name || '',
      payerUtr: '',
    })
    setIsEventPaymentOpen(true)
  }

  async function handleSubmitEventProof(event) {
    event.preventDefault()
    if (!latestEventPayment?.id) return

    const payerName = String(eventPaymentForm.payerName || '').trim()
    const payerUtr = String(eventPaymentForm.payerUtr || '').trim()
    setEventPaymentError('')
    setEventPaymentSuccess('')

    if (!payerName) {
      setEventPaymentError(copy.payerNameError)
      return
    }
    if (payerUtr.length < 8) {
      setEventPaymentError(copy.payerUtrError)
      return
    }

    const result = await submitDonationProof({
      paymentId: latestEventPayment.id,
      payerName,
      payerUtr,
    })
    if (!result.ok) {
      setEventPaymentError(result.message || copy.proofFailed)
      return
    }

    setLatestEventPayment((current) => (current ? { ...current, proofSubmitted: true } : current))
    setEventPaymentSuccess(copy.proofSuccess)
  }

  function closeEventPaymentModal() {
    setIsEventPaymentOpen(false)
    setLatestEventPayment(null)
    setEventPaymentForm({
      payerName: currentUser?.name || '',
      payerUtr: '',
    })
    setEventPaymentError('')
    setEventPaymentSuccess('')
  }

  function closeProfileDonationModal() {
    setIsProfileDonationOpen(false)
    setLatestProfileDonation(null)
    setProfileProofForm({
      payerName: currentUser?.name || '',
      payerUtr: '',
    })
    setProfileProofError('')
    setProfileProofSuccess('')
  }

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

      <Card>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-700 dark:text-orange-300">{copy.quickDonation}</p>
        <h2 className="mt-2 font-serif text-3xl text-orange-950 dark:text-amber-50">{copy.completeDonationPayment}</h2>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="space-y-1 sm:col-span-1">
            <span className="block text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{copy.donationAmount}</span>
            <input
              type="number"
              min="1"
              value={profileDonationForm.amount}
              onChange={(event) => setProfileDonationForm((current) => ({ ...current, amount: event.target.value }))}
              className="focus-ring w-full rounded-[18px] border border-orange-200 bg-white px-3 py-2 dark:border-orange-900/40 dark:bg-zinc-900"
              placeholder="501"
            />
          </label>

          <label className="space-y-1 sm:col-span-1">
            <span className="block text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{copy.purpose}</span>
            <select
              value={selectedProfileDonationPurpose}
              onChange={(event) => setProfileDonationForm((current) => ({ ...current, purpose: event.target.value }))}
              className="focus-ring w-full rounded-[18px] border border-orange-200 bg-white px-3 py-2 dark:border-orange-900/40 dark:bg-zinc-900"
            >
              {(fundCategories || []).map((item) => (
                <option key={item} value={item}>{translateValue(language, item)}</option>
              ))}
            </select>
          </label>

          <div className="space-y-1 sm:col-span-1">
            <span className="block text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{copy.paymentMethod}</span>
            <div className="grid grid-cols-2 gap-2">
              {['UPI', 'Bank Transfer'].map((method) => {
                const isSelected = profileDonationForm.paymentMethod === method
                return (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setProfileDonationForm((current) => ({ ...current, paymentMethod: method }))}
                    className={`focus-ring rounded-[16px] border px-3 py-2 text-xs font-semibold transition ${
                      isSelected
                        ? 'border-orange-500 bg-orange-100 text-orange-900 dark:border-orange-600 dark:bg-orange-900/40 dark:text-orange-100'
                        : 'border-orange-200 bg-white text-zinc-700 dark:border-orange-900/40 dark:bg-zinc-900 dark:text-zinc-200'
                    }`}
                  >
                    {translateValue(language, method)}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {profileDonationError && (
          <p className="mt-4 rounded-[18px] bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:bg-red-950/35 dark:text-red-200">
            {profileDonationError}
          </p>
        )}

        <button
          type="button"
          onClick={handleCreateProfileDonation}
          disabled={working}
          className="focus-ring mt-4 rounded-full bg-[linear-gradient(135deg,#c2410c,#f59e0b)] px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {copy.createPaymentIntent}
        </button>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-700 dark:text-orange-300">{copy.events}</p>
          <h2 className="mt-2 font-serif text-3xl text-orange-950 dark:text-amber-50">{copy.eventCatalog}</h2>
          {eventRegisterError && (
            <p className="mt-4 rounded-[18px] bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:bg-red-950/35 dark:text-red-200">
              {eventRegisterError}
            </p>
          )}
          {eventRegisterSuccess && (
            <p className="mt-4 rounded-[18px] bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/35 dark:text-emerald-200">
              {eventRegisterSuccess}
            </p>
          )}
          {sortedEvents.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">{copy.noEvents}</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {sortedEvents.map((event) => {
                const existingRegistration = registrationByEventId[event.id] || null
                const isRegistered = Boolean(existingRegistration || event.isFamilyRegistered)
                const seatsAvailable = Number(event.seatsAvailable || 0)
                const isSoldOut = seatsAvailable <= 0
                const requestedSeats = eventSeatsById[event.id] ?? 1

                return (
                  <li key={event.id} className="rounded-[22px] border border-orange-200/70 bg-white/72 px-4 py-3 dark:border-orange-900/30 dark:bg-white/5">
                    <p className="font-semibold text-zinc-800 dark:text-zinc-100">{event.name}</p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-300">
                      {formatLocalizedDate(event.date, language, { day: '2-digit', month: 'short', year: 'numeric' })} | {copy.hall}: {event.hall || '-'}
                    </p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-300">
                      {copy.fee}: {formatLocalizedCurrency(event.feePerFamily || 0, language)} | {copy.seats}: {event.seatsAvailable ?? 0}/{event.capacity || 0}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.12em] text-orange-700 dark:text-orange-300">
                      {copy.registered}: {isRegistered ? 'Yes' : 'No'}
                    </p>

                    {isRegistered ? (
                      <span className="mt-3 inline-flex rounded-full border border-emerald-300 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-700 dark:text-emerald-300">
                        {copy.alreadyRegisteredEvent}
                      </span>
                    ) : isSoldOut ? (
                      <span className="mt-3 inline-flex rounded-full border border-red-300 px-3 py-1 text-xs font-semibold text-red-700 dark:border-red-700 dark:text-red-300">
                        {copy.soldOut}
                      </span>
                    ) : (
                      <div className="mt-3 flex flex-wrap items-end gap-2">
                        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-600 dark:text-zinc-300">
                          {copy.seatsToRegister}
                          <input
                            type="number"
                            min="1"
                            max={Math.max(1, seatsAvailable)}
                            value={requestedSeats}
                            onChange={(eventInput) =>
                              setEventSeatsById((current) => ({ ...current, [event.id]: eventInput.target.value }))
                            }
                            className="focus-ring w-24 rounded-[14px] border border-orange-200 bg-white px-3 py-2 text-sm text-zinc-800 dark:border-orange-900/40 dark:bg-zinc-900 dark:text-zinc-100"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => handleRegisterEvent(event)}
                          disabled={working}
                          className="focus-ring rounded-full bg-[linear-gradient(135deg,#c2410c,#f59e0b)] px-4 py-2 text-xs font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {copy.registerEvent}
                        </button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <Card>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-700 dark:text-orange-300">{copy.events}</p>
          <h2 className="mt-2 font-serif text-3xl text-orange-950 dark:text-amber-50">{copy.registrations}</h2>
          {eventPaymentError && (
            <p className="mt-4 rounded-[18px] bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:bg-red-950/35 dark:text-red-200">
              {eventPaymentError}
            </p>
          )}
          {sortedRegistrations.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">{copy.noRegistrations}</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {sortedRegistrations.map((registration) => {
                const linkedStatus = registration.linkedTransaction?.status || ''
                const pendingIntentStatus = pendingIntentLookup[registration.linkedTransaction?.id || ''] || ''
                const paymentStatus = registration.paymentStatus || linkedStatus || '-'
                const approvalStatus = registration.approvalStatus || '-'
                const isPaid = linkedStatus === 'Paid' || paymentStatus === 'Paid'
                const hasPendingIntent = ['Pending', 'Proof Submitted'].includes(pendingIntentStatus)
                const isPending = hasPendingIntent || paymentStatus === 'Proof Submitted'
                const canPayNow = Boolean(registration.canPayNow) && !isPaid && !hasPendingIntent
                const isNotRequired = paymentStatus === 'Not Required'

                return (
                  <li key={registration.id} className="rounded-[22px] border border-orange-200/70 bg-white/72 px-4 py-4 dark:border-orange-900/30 dark:bg-white/5">
                    <p className="font-semibold text-zinc-800 dark:text-zinc-100">{registration.eventName || registration.eventId}</p>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                      {formatLocalizedDate(registration.eventDate || registration.registeredAt, language, { day: '2-digit', month: 'short', year: 'numeric' })} | {copy.hall}: {registration.eventHall || '-'}
                    </p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-300">
                      {copy.seats}: {registration.seats || 0} | {copy.amount}: {formatLocalizedCurrency(registration.totalAmount || 0, language)}
                    </p>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-xs uppercase tracking-[0.12em] text-orange-700 dark:text-orange-300">
                          {copy.status}: {translateValue(language, paymentStatus)}
                        </p>
                        <p className="text-xs uppercase tracking-[0.12em] text-zinc-600 dark:text-zinc-300">
                          {copy.approval}: {translateValue(language, approvalStatus)}
                        </p>
                      </div>
                      {isPaid ? (
                        <span className="rounded-full border border-emerald-300 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-700 dark:text-emerald-300">
                          {copy.alreadyPaid}
                        </span>
                      ) : isPending ? (
                        <span className="rounded-full border border-amber-300 px-3 py-1 text-xs font-semibold text-amber-700 dark:border-amber-700 dark:text-amber-300">
                          {copy.paymentInProgress}
                        </span>
                      ) : canPayNow ? (
                        <button
                          type="button"
                          onClick={() => handleStartEventPayment(registration)}
                          disabled={working}
                          className="focus-ring rounded-full bg-[linear-gradient(135deg,#c2410c,#f59e0b)] px-4 py-2 text-xs font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {copy.payNow}
                        </button>
                      ) : isNotRequired ? (
                        <span className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
                          {copy.notRequired}
                        </span>
                      ) : (
                        <span className="rounded-full border border-amber-300 px-3 py-1 text-xs font-semibold text-amber-700 dark:border-amber-700 dark:text-amber-300">
                          {copy.paymentInProgress}
                        </span>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>

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

      <Modal
        title={latestProfileDonation?.proofSubmitted ? copy.submittedDonation : copy.completeDonation}
        open={isProfileDonationOpen}
        onClose={closeProfileDonationModal}
        disableClose={Boolean(latestProfileDonation && !latestProfileDonation?.proofSubmitted)}
      >
        {latestProfileDonation && (
          <div className="space-y-4 text-sm text-zinc-700 dark:text-zinc-200">
            <p>
              {copy.donationIntentCreated}{' '}
              <strong className="text-orange-800 dark:text-orange-200">{formatLocalizedCurrency(latestProfileDonation.amount, language)}</strong>.
            </p>
            <p><strong>{copy.purpose}:</strong> {translateValue(language, latestProfileDonation.purpose || copy.noPurposeFallback)}</p>
            <p><strong>{copy.paymentMethod}:</strong> {translateValue(language, latestProfileDonation.paymentMethod || '-')}</p>
            <p><strong>{copy.date}:</strong> {formatLocalizedDate(latestProfileDonation.date, language, { day: '2-digit', month: 'short', year: 'numeric' })}</p>

            {latestProfileDonation.instructions?.upiLink && (
              <div className="space-y-3 rounded-[24px] border border-orange-200/70 bg-white/76 p-4 dark:border-orange-900/30 dark:bg-white/5">
                <p className="font-semibold text-orange-900 dark:text-orange-200">{copy.upiPayment}</p>
                <p>{copy.chooseUpi}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {profileDonationUpiOptions.map((option) => (
                    <a
                      key={option.id}
                      href={option.href}
                      className="focus-ring rounded-[18px] border border-orange-300 bg-white px-3 py-2 text-center font-semibold text-orange-900 transition hover:bg-orange-100 dark:border-orange-800 dark:bg-zinc-900 dark:text-orange-200 dark:hover:bg-zinc-700"
                    >
                      {translateValue(language, option.label)}
                    </a>
                  ))}
                </div>
                {platformFlags.isDesktop && latestProfileDonation.instructions?.upiQrDataUrl && (
                  <div className="rounded-[20px] border border-orange-200 bg-white p-3 text-center dark:border-orange-900/40 dark:bg-zinc-900">
                    <p className="mb-2 font-semibold text-zinc-800 dark:text-zinc-100">{copy.scanQr}</p>
                    <img
                      src={latestProfileDonation.instructions.upiQrDataUrl}
                      alt="UPI payment QR code"
                      className="mx-auto h-56 w-56 rounded-[18px] border border-orange-100 bg-white p-2 dark:border-orange-900/40"
                    />
                  </div>
                )}
                <p className="break-all rounded-[18px] bg-white px-3 py-2 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
                  {copy.upiLink}: {latestProfileDonation.instructions.upiLink}
                </p>
              </div>
            )}

            {latestProfileDonation.instructions?.bankTransfer && (
              <div className="rounded-[20px] bg-white px-4 py-3 dark:bg-zinc-800">
                <p className="font-semibold">{copy.bankTransfer}</p>
                <p>{latestProfileDonation.instructions.bankTransfer.payeeName}</p>
                <p>{latestProfileDonation.instructions.bankTransfer.bankName}</p>
                <p>{copy.ac}: {latestProfileDonation.instructions.bankTransfer.accountNumber}</p>
                <p>IFSC: {latestProfileDonation.instructions.bankTransfer.ifsc}</p>
              </div>
            )}

            <form
              className="space-y-3 rounded-[24px] border border-orange-200/70 bg-white/76 p-4 dark:border-orange-900/30 dark:bg-white/5"
              onSubmit={handleSubmitProfileDonationProof}
            >
              <p className="font-semibold text-zinc-800 dark:text-zinc-100">{copy.submitProofTitle}</p>
              <p className="text-xs text-zinc-600 dark:text-zinc-300">
                {copy.submitProofBody}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{copy.payerName}</span>
                  <input
                    value={profileProofForm.payerName}
                    onChange={(event) => setProfileProofForm((current) => ({ ...current, payerName: event.target.value }))}
                    className="focus-ring w-full rounded-[18px] border border-orange-200 bg-white px-3 py-2 dark:border-orange-900/40 dark:bg-zinc-900"
                    placeholder={copy.payerNamePlaceholder}
                    required
                  />
                </label>
                <label className="space-y-1">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{copy.payerUtr}</span>
                  <input
                    value={profileProofForm.payerUtr}
                    onChange={(event) => setProfileProofForm((current) => ({ ...current, payerUtr: event.target.value }))}
                    className="focus-ring w-full rounded-[18px] border border-orange-200 bg-white px-3 py-2 dark:border-orange-900/40 dark:bg-zinc-900"
                    placeholder={copy.payerUtrPlaceholder}
                    minLength={8}
                    required
                  />
                </label>
              </div>

              {profileProofError && (
                <p className="rounded-[18px] bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:bg-red-950/35 dark:text-red-200">
                  {profileProofError}
                </p>
              )}

              {profileProofSuccess && (
                <p className="rounded-[18px] bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/35 dark:text-emerald-200">
                  {profileProofSuccess}
                </p>
              )}

              {!latestProfileDonation.proofSubmitted && (
                <button
                  type="submit"
                  className="focus-ring rounded-full bg-[linear-gradient(135deg,#c2410c,#f59e0b)] px-5 py-2.5 font-semibold text-white transition hover:brightness-105"
                >
                  {copy.submitProof}
                </button>
              )}

              {latestProfileDonation.proofSubmitted && (
                <button
                  type="button"
                  onClick={closeProfileDonationModal}
                  className="focus-ring rounded-full border border-orange-300 px-5 py-2.5 font-semibold text-orange-900 dark:border-orange-800 dark:text-orange-200"
                >
                  {copy.close}
                </button>
              )}
            </form>
          </div>
        )}
      </Modal>

      <Modal
        title={copy.completeEventPayment}
        open={isEventPaymentOpen}
        onClose={closeEventPaymentModal}
        disableClose={Boolean(latestEventPayment && !latestEventPayment?.proofSubmitted)}
      >
        {latestEventPayment && (
          <div className="space-y-4 text-sm text-zinc-700 dark:text-zinc-200">
            <p>
              {copy.eventPaymentIntentCreated}{' '}
              <strong className="text-orange-800 dark:text-orange-200">{formatLocalizedCurrency(latestEventPayment.amount, language)}</strong>.
            </p>
            <p><strong>{copy.purpose}:</strong> {translateValue(language, latestEventPayment.registration?.eventName || latestEventPayment.purpose)}</p>
            <p><strong>{copy.date}:</strong> {formatLocalizedDate(latestEventPayment.date, language, { day: '2-digit', month: 'short', year: 'numeric' })}</p>

            {latestEventPayment.instructions?.upiLink && (
              <div className="space-y-3 rounded-[24px] border border-orange-200/70 bg-white/76 p-4 dark:border-orange-900/30 dark:bg-white/5">
                <p className="font-semibold text-orange-900 dark:text-orange-200">{copy.upiPayment}</p>
                <p>{copy.chooseUpi}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {upiPaymentOptions.map((option) => (
                    <a
                      key={option.id}
                      href={option.href}
                      className="focus-ring rounded-[18px] border border-orange-300 bg-white px-3 py-2 text-center font-semibold text-orange-900 transition hover:bg-orange-100 dark:border-orange-800 dark:bg-zinc-900 dark:text-orange-200 dark:hover:bg-zinc-700"
                    >
                      {translateValue(language, option.label)}
                    </a>
                  ))}
                </div>
                {platformFlags.isDesktop && latestEventPayment.instructions?.upiQrDataUrl && (
                  <div className="rounded-[20px] border border-orange-200 bg-white p-3 text-center dark:border-orange-900/40 dark:bg-zinc-900">
                    <p className="mb-2 font-semibold text-zinc-800 dark:text-zinc-100">{copy.scanQr}</p>
                    <img
                      src={latestEventPayment.instructions.upiQrDataUrl}
                      alt="UPI payment QR code"
                      className="mx-auto h-56 w-56 rounded-[18px] border border-orange-100 bg-white p-2 dark:border-orange-900/40"
                    />
                  </div>
                )}
                <p className="break-all rounded-[18px] bg-white px-3 py-2 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
                  {copy.upiLink}: {latestEventPayment.instructions.upiLink}
                </p>
              </div>
            )}

            {latestEventPayment.instructions?.bankTransfer && (
              <div className="rounded-[20px] bg-white px-4 py-3 dark:bg-zinc-800">
                <p className="font-semibold">{copy.bankTransfer}</p>
                <p>{latestEventPayment.instructions.bankTransfer.payeeName}</p>
                <p>{latestEventPayment.instructions.bankTransfer.bankName}</p>
                <p>{copy.ac}: {latestEventPayment.instructions.bankTransfer.accountNumber}</p>
                <p>IFSC: {latestEventPayment.instructions.bankTransfer.ifsc}</p>
              </div>
            )}

            <form
              className="space-y-3 rounded-[24px] border border-orange-200/70 bg-white/76 p-4 dark:border-orange-900/30 dark:bg-white/5"
              onSubmit={handleSubmitEventProof}
            >
              <p className="font-semibold text-zinc-800 dark:text-zinc-100">{copy.submitProofTitle}</p>
              <p className="text-xs text-zinc-600 dark:text-zinc-300">
                {copy.submitProofBody}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{copy.payerName}</span>
                  <input
                    value={eventPaymentForm.payerName}
                    onChange={(event) => setEventPaymentForm((current) => ({ ...current, payerName: event.target.value }))}
                    className="focus-ring w-full rounded-[18px] border border-orange-200 bg-white px-3 py-2 dark:border-orange-900/40 dark:bg-zinc-900"
                    placeholder={copy.payerNamePlaceholder}
                    required
                  />
                </label>
                <label className="space-y-1">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{copy.payerUtr}</span>
                  <input
                    value={eventPaymentForm.payerUtr}
                    onChange={(event) => setEventPaymentForm((current) => ({ ...current, payerUtr: event.target.value }))}
                    className="focus-ring w-full rounded-[18px] border border-orange-200 bg-white px-3 py-2 dark:border-orange-900/40 dark:bg-zinc-900"
                    placeholder={copy.payerUtrPlaceholder}
                    minLength={8}
                    required
                  />
                </label>
              </div>

              {eventPaymentError && (
                <p className="rounded-[18px] bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:bg-red-950/35 dark:text-red-200">
                  {eventPaymentError}
                </p>
              )}

              {eventPaymentSuccess && (
                <p className="rounded-[18px] bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/35 dark:text-emerald-200">
                  {eventPaymentSuccess}
                </p>
              )}

              {!latestEventPayment.proofSubmitted && (
                <button
                  type="submit"
                  className="focus-ring rounded-full bg-[linear-gradient(135deg,#c2410c,#f59e0b)] px-5 py-2.5 font-semibold text-white transition hover:brightness-105"
                >
                  {copy.submitProof}
                </button>
              )}

              {latestEventPayment.proofSubmitted && (
                <button
                  type="button"
                  onClick={closeEventPaymentModal}
                  className="focus-ring rounded-full border border-orange-300 px-5 py-2.5 font-semibold text-orange-900 dark:border-orange-800 dark:text-orange-200"
                >
                  {copy.close}
                </button>
              )}
            </form>
          </div>
        )}
      </Modal>
    </div>
  )
}
