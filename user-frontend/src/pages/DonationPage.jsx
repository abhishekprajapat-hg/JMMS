import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../components/Card'
import { DonationForm } from '../components/DonationForm'
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

const paymentDisplayLabels = ['UPI', 'Bank Transfer']

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

export function DonationPage() {
  const {
    currentUser,
    isAuthenticated,
    userDonations,
    addDonation,
    submitDonationProof,
    paymentGateways,
    paymentPortal,
    fundCategories,
    pendingPaymentIntents,
    language,
  } = useApp()

  const [latestDonation, setLatestDonation] = useState(null)
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false)
  const [error, setError] = useState('')
  const [proofError, setProofError] = useState('')
  const [proofSuccess, setProofSuccess] = useState('')
  const [proofForm, setProofForm] = useState({
    payerName: '',
    payerUtr: '',
  })

  const copy = pickByLanguage(language, {
    en: {
      eyebrow: 'Seva',
      title: 'Donation Portal',
      description: 'Create payment intents directly with backend integration, choose your payment mode, and track contribution history through a cleaner premium flow.',
      loginRequired: 'Donation submission requires login.',
      loginNow: 'Login now',
      loginBody: 'to create payment intents linked with your family account.',
      contributionFlow: 'Contribution Flow',
      makeDonation: 'Make a Donation',
      donationBody: 'This form creates a backend payment intent at /api/user/payments/intents and prepares a guided confirmation flow.',
      paymentModes: 'Payment Modes',
      simpleOptions: 'Simple and trusted options',
      backendGatewayModes: 'Backend Gateway Modes',
      pendingIntents: 'Pending / Submitted Payment Intents',
      items: (count) => `${formatLocalizedNumber(count, language)} item(s)`,
      recentActivity: 'Recent Activity',
      historyPreview: 'Donation history preview',
      lastFive: 'Last 5',
      noHistory: 'No donation records yet.',
      completeDonation: 'Complete Your Donation',
      submittedDonation: 'Donation Submitted',
      paymentIntentCreated: 'Payment intent created for',
      purpose: 'Purpose',
      gateway: 'Gateway',
      date: 'Date',
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
    },
    hi: {
      eyebrow: 'सेवा',
      title: 'दान पोर्टल',
      description: 'बैकएंड इंटीग्रेशन के साथ सीधे पेमेंट इंटेंट बनाएँ, अपनी भुगतान विधि चुनें और अधिक साफ प्रीमियम फ्लो में योगदान इतिहास ट्रैक करें।',
      loginRequired: 'दान जमा करने के लिए लॉगिन आवश्यक है।',
      loginNow: 'अभी लॉगिन करें',
      loginBody: 'ताकि आपके परिवार खाते से जुड़े पेमेंट इंटेंट बन सकें।',
      contributionFlow: 'योगदान प्रवाह',
      makeDonation: 'दान करें',
      donationBody: 'यह फॉर्म /api/user/payments/intents पर बैकएंड पेमेंट इंटेंट बनाता है और एक मार्गदर्शित पुष्टि प्रवाह तैयार करता है।',
      paymentModes: 'भुगतान विधियाँ',
      simpleOptions: 'सरल और भरोसेमंद विकल्प',
      backendGatewayModes: 'बैकएंड गेटवे मोड्स',
      pendingIntents: 'लंबित / जमा किए गए पेमेंट इंटेंट्स',
      items: (count) => `${formatLocalizedNumber(count, language)} आइटम`,
      recentActivity: 'हाल की गतिविधि',
      historyPreview: 'दान इतिहास झलक',
      lastFive: 'अंतिम 5',
      noHistory: 'अभी तक कोई दान रिकॉर्ड नहीं है।',
      completeDonation: 'अपना दान पूरा करें',
      submittedDonation: 'दान जमा हो गया',
      paymentIntentCreated: 'इस राशि के लिए पेमेंट इंटेंट बनाया गया:',
      purpose: 'उद्देश्य',
      gateway: 'गेटवे',
      date: 'तारीख',
      upiPayment: 'UPI भुगतान',
      chooseUpi: 'भुगतान जारी रखने के लिए नीचे कोई UPI ऐप चुनें।',
      scanQr: 'अपने UPI ऐप से QR स्कैन करें',
      bankTransfer: 'बैंक ट्रांसफर',
      submitProofTitle: 'भुगतान प्रमाण जमा करें (आवश्यक)',
      submitProofBody: 'भुगतान के बाद अपना पेयर नाम और UTR / ट्रांजैक्शन रेफरेंस दर्ज करें।',
      payerName: 'पेयर नाम',
      payerNamePlaceholder: 'भुगतान में उपयोग किया गया नाम',
      payerUtr: 'UTR / ट्रांजैक्शन ID',
      payerUtrPlaceholder: 'UTR या रेफरेंस नंबर दर्ज करें',
      submitProof: 'प्रमाण जमा करें',
      close: 'बंद करें',
      payerNameError: 'कृपया पेयर नाम दर्ज करें।',
      payerUtrError: 'कृपया सही UTR / ट्रांजैक्शन ID दर्ज करें (कम से कम 8 अक्षर)।',
      proofFailed: 'अभी भुगतान प्रमाण जमा नहीं हो सका।',
      proofSuccess: 'प्रमाण सफलतापूर्वक जमा हो गया। टीम शीघ्र ही आपके भुगतान की पुष्टि करेगी।',
      upiLink: 'UPI लिंक',
      ac: 'खाता',
    },
  })

  const platformFlags = useMemo(() => getPlatformFlags(), [])

  const donationHistoryPreview = useMemo(() => userDonations.slice(0, 5), [userDonations])
  const upiPaymentOptions = useMemo(() => {
    const upiLink = latestDonation?.instructions?.upiLink || ''
    if (!upiLink) return []
    return upiAppOptions.map((option) => ({
      ...option,
      href: buildUpiPayLink(upiLink, option.packageName, platformFlags),
    }))
  }, [latestDonation, platformFlags])

  async function handleDonationSubmit(values) {
    setError('')
    const result = await addDonation(values)
    if (!result.ok) {
      setError(result.message)
      return
    }
    setLatestDonation(result.donation)
    setProofForm({
      payerName: currentUser?.name || values.name || '',
      payerUtr: '',
    })
    setProofError('')
    setProofSuccess('')
    setIsConfirmationOpen(true)
  }

  async function handleProofSubmit(event) {
    event.preventDefault()
    if (!latestDonation?.id) return

    const payerName = String(proofForm.payerName || '').trim()
    const payerUtr = String(proofForm.payerUtr || '').trim()

    setProofError('')
    setProofSuccess('')

    if (!payerName) {
      setProofError(copy.payerNameError)
      return
    }
    if (payerUtr.length < 8) {
      setProofError(copy.payerUtrError)
      return
    }

    const result = await submitDonationProof({
      paymentId: latestDonation.id,
      payerName,
      payerUtr,
    })

    if (!result.ok) {
      setProofError(result.message || copy.proofFailed)
      return
    }

    setLatestDonation((current) => {
      if (!current) return current
      return {
        ...current,
        status: result.paymentIntent?.status || 'Proof Submitted',
        proofSubmitted: true,
      }
    })
    setProofSuccess(copy.proofSuccess)
  }

  function closeConfirmation() {
    setIsConfirmationOpen(false)
    setLatestDonation(null)
    setProofForm({
      payerName: currentUser?.name || '',
      payerUtr: '',
    })
    setProofError('')
    setProofSuccess('')
  }

  const needsProofSubmission = Boolean(latestDonation) && !latestDonation?.proofSubmitted

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
      />

      {!isAuthenticated && (
        <Card className="border-orange-200 bg-orange-50/78 dark:border-orange-900/35 dark:bg-orange-950/18">
          <p className="text-sm leading-7 text-zinc-700 dark:text-zinc-200">
            {copy.loginRequired}{' '}
            <Link to="/login" className="font-bold text-orange-700 dark:text-orange-300">{copy.loginNow}</Link>{' '}
            {copy.loginBody}
          </p>
        </Card>
      )}

      <section className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
        <Card>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-700 dark:text-orange-300">{copy.contributionFlow}</p>
          <h2 className="mt-2 font-serif text-4xl text-orange-950 dark:text-amber-50">{copy.makeDonation}</h2>
          <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
            {copy.donationBody}
          </p>

          <div className="mt-6">
            <DonationForm
              onSubmit={handleDonationSubmit}
              defaultValues={{
                name: currentUser?.name,
                email: currentUser?.email,
                phone: currentUser?.phone,
              }}
              purposeOptions={fundCategories}
            />
          </div>

          {error && (
            <p className="mt-4 rounded-[20px] bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-950/35 dark:text-red-200">
              {error}
            </p>
          )}
        </Card>

        <div className="grid gap-5">
          <Card>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-700 dark:text-orange-300">{copy.paymentModes}</p>
            <h2 className="mt-2 font-serif text-4xl text-orange-950 dark:text-amber-50">{copy.simpleOptions}</h2>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {paymentDisplayLabels.map((method) => (
                <div
                  key={method}
                  className="rounded-[24px] border border-orange-200/70 bg-white/76 px-4 py-4 text-sm font-semibold text-orange-900 dark:border-orange-900/30 dark:bg-white/5 dark:text-orange-100"
                >
                  {translateValue(language, method)}
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-[24px] border border-orange-200/70 bg-white/76 p-4 dark:border-orange-900/30 dark:bg-white/5">
              <p className="font-semibold text-zinc-800 dark:text-zinc-100">{copy.backendGatewayModes}</p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                {paymentGateways.map((gateway) => (
                  <li key={gateway}>{translateValue(language, gateway)}</li>
                ))}
              </ul>
              {paymentPortal?.upiVpa && (
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-orange-700 dark:text-orange-300">
                  UPI VPA: {paymentPortal.upiVpa}
                </p>
              )}
            </div>

            {pendingPaymentIntents.length > 0 && (
              <div className="mt-5 rounded-[24px] border border-orange-200/70 bg-orange-50/76 p-4 text-sm dark:border-orange-900/30 dark:bg-orange-950/16">
                <p className="font-semibold text-orange-900 dark:text-orange-200">{copy.pendingIntents}</p>
                <p className="mt-1 text-zinc-700 dark:text-zinc-300">{copy.items(pendingPaymentIntents.length)}</p>
              </div>
            )}
          </Card>

          <Card>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-700 dark:text-orange-300">{copy.recentActivity}</p>
                <h2 className="mt-2 font-serif text-3xl text-orange-950 dark:text-amber-50">{copy.historyPreview}</h2>
              </div>
              <span className="rounded-full border border-orange-200/80 bg-orange-50/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-orange-800 dark:border-orange-900/40 dark:bg-orange-950/18 dark:text-orange-200">
                {copy.lastFive}
              </span>
            </div>

            {donationHistoryPreview.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">{copy.noHistory}</p>
            ) : (
              <ul className="mt-4 space-y-3 text-sm">
                {donationHistoryPreview.map((donation) => (
                  <li
                    key={donation.id}
                    className="flex items-center justify-between gap-4 rounded-[22px] border border-orange-200/70 bg-white/76 px-4 py-3 dark:border-orange-900/30 dark:bg-white/5"
                  >
                    <div>
                      <p className="font-semibold text-zinc-800 dark:text-zinc-100">{translateValue(language, donation.purpose)}</p>
                      <p className="text-xs uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">{formatLocalizedDate(donation.date, language, { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    </div>
                    <span className="font-bold text-orange-800 dark:text-orange-200">
                      {formatLocalizedCurrency(donation.amount, language)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </section>

      <Modal
        title={needsProofSubmission ? copy.completeDonation : copy.submittedDonation}
        open={isConfirmationOpen}
        onClose={closeConfirmation}
        disableClose={needsProofSubmission}
      >
        {latestDonation && (
          <div className="space-y-4 text-sm text-zinc-700 dark:text-zinc-200">
            <p>
              {copy.paymentIntentCreated}{' '}
              <strong className="text-orange-800 dark:text-orange-200">{formatLocalizedCurrency(latestDonation.amount, language)}</strong>.
            </p>
            <p><strong>{copy.purpose}:</strong> {translateValue(language, latestDonation.purpose)}</p>
            <p><strong>{copy.gateway}:</strong> {translateValue(language, latestDonation.paymentMethod)}</p>
            <p><strong>{copy.date}:</strong> {formatLocalizedDate(latestDonation.date, language, { day: '2-digit', month: 'short', year: 'numeric' })}</p>

            {latestDonation.instructions?.upiLink && (
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
                {platformFlags.isDesktop && latestDonation.instructions?.upiQrDataUrl && (
                  <div className="rounded-[20px] border border-orange-200 bg-white p-3 text-center dark:border-orange-900/40 dark:bg-zinc-900">
                    <p className="mb-2 font-semibold text-zinc-800 dark:text-zinc-100">{copy.scanQr}</p>
                    <img
                      src={latestDonation.instructions.upiQrDataUrl}
                      alt="UPI payment QR code"
                      className="mx-auto h-56 w-56 rounded-[18px] border border-orange-100 bg-white p-2 dark:border-orange-900/40"
                    />
                  </div>
                )}
                <p className="break-all rounded-[18px] bg-white px-3 py-2 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
                  {copy.upiLink}: {latestDonation.instructions.upiLink}
                </p>
              </div>
            )}

            {latestDonation.instructions?.bankTransfer && (
              <div className="rounded-[20px] bg-white px-4 py-3 dark:bg-zinc-800">
                <p className="font-semibold">{copy.bankTransfer}</p>
                <p>{latestDonation.instructions.bankTransfer.payeeName}</p>
                <p>{latestDonation.instructions.bankTransfer.bankName}</p>
                <p>{copy.ac}: {latestDonation.instructions.bankTransfer.accountNumber}</p>
                <p>IFSC: {latestDonation.instructions.bankTransfer.ifsc}</p>
              </div>
            )}

            <form
              className="space-y-3 rounded-[24px] border border-orange-200/70 bg-white/76 p-4 dark:border-orange-900/30 dark:bg-white/5"
              onSubmit={handleProofSubmit}
            >
              <p className="font-semibold text-zinc-800 dark:text-zinc-100">{copy.submitProofTitle}</p>
              <p className="text-xs text-zinc-600 dark:text-zinc-300">
                {copy.submitProofBody}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{copy.payerName}</span>
                  <input
                    value={proofForm.payerName}
                    onChange={(event) => setProofForm((current) => ({ ...current, payerName: event.target.value }))}
                    className="focus-ring w-full rounded-[18px] border border-orange-200 bg-white px-3 py-2 dark:border-orange-900/40 dark:bg-zinc-900"
                    placeholder={copy.payerNamePlaceholder}
                    required
                  />
                </label>
                <label className="space-y-1">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{copy.payerUtr}</span>
                  <input
                    value={proofForm.payerUtr}
                    onChange={(event) => setProofForm((current) => ({ ...current, payerUtr: event.target.value }))}
                    className="focus-ring w-full rounded-[18px] border border-orange-200 bg-white px-3 py-2 dark:border-orange-900/40 dark:bg-zinc-900"
                    placeholder={copy.payerUtrPlaceholder}
                    minLength={8}
                    required
                  />
                </label>
              </div>

              {proofError && (
                <p className="rounded-[18px] bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:bg-red-950/35 dark:text-red-200">
                  {proofError}
                </p>
              )}

              {proofSuccess && (
                <p className="rounded-[18px] bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/35 dark:text-emerald-200">
                  {proofSuccess}
                </p>
              )}

              {!latestDonation.proofSubmitted && (
                <button
                  type="submit"
                  className="focus-ring rounded-full bg-[linear-gradient(135deg,#c2410c,#f59e0b)] px-5 py-2.5 font-semibold text-white transition hover:brightness-105"
                >
                  {copy.submitProof}
                </button>
              )}

              {latestDonation.proofSubmitted && (
                <button
                  type="button"
                  onClick={closeConfirmation}
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
