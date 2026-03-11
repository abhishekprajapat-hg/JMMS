import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../components/Card'
import { DonationForm } from '../components/DonationForm'
import { Modal } from '../components/Modal'
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
      setProofError('Please enter payer name.')
      return
    }
    if (payerUtr.length < 8) {
      setProofError('Please enter a valid UTR / Transaction ID (minimum 8 characters).')
      return
    }

    const result = await submitDonationProof({
      paymentId: latestDonation.id,
      payerName,
      payerUtr,
    })

    if (!result.ok) {
      setProofError(result.message || 'Unable to submit payment proof right now.')
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
    setProofSuccess('Proof submitted successfully. Team will verify your payment shortly.')
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
        eyebrow="Seva"
        title="Donation Portal"
        description="Create payment intents directly with backend integration and track your contribution history."
      />

      {!isAuthenticated && (
        <Card className="border-orange-200 bg-orange-50/70 dark:border-orange-900/40 dark:bg-zinc-900">
          <p className="text-sm text-zinc-700 dark:text-zinc-200">
            Donation submission requires login.
            {' '}
            <Link to="/login" className="font-bold text-orange-700 dark:text-orange-300">Login now</Link>
            {' '}
            to create payment intents linked with your family account.
          </p>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <h2 className="font-serif text-2xl text-orange-900 dark:text-orange-100">Make a Donation</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            This form creates a backend payment intent at <code>/api/user/payments/intents</code>.
          </p>

          <div className="mt-4">
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
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-200">
              {error}
            </p>
          )}
        </Card>

        <Card>
          <h2 className="font-serif text-2xl text-orange-900 dark:text-orange-100">Payment Options</h2>
          <div className="mt-4 grid gap-2">
            {paymentDisplayLabels.map((method) => (
              <div
                key={method}
                className="rounded-xl border border-orange-200 bg-orange-50/70 px-4 py-3 text-sm font-semibold text-orange-900 dark:border-orange-900/40 dark:bg-zinc-800 dark:text-orange-100"
              >
                {method}
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-orange-100 bg-white p-4 text-sm dark:border-orange-900/40 dark:bg-zinc-800/70">
            <p className="font-semibold text-zinc-800 dark:text-zinc-100">Backend Gateway Modes</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-zinc-600 dark:text-zinc-300">
              {paymentGateways.map((gateway) => (
                <li key={gateway}>{gateway}</li>
              ))}
            </ul>
            {paymentPortal?.upiVpa && (
              <p className="mt-2 text-xs text-orange-700 dark:text-orange-300">UPI VPA: {paymentPortal.upiVpa}</p>
            )}
          </div>

          <div className="mt-6 rounded-xl border border-orange-100 bg-white p-4 dark:border-orange-900/40 dark:bg-zinc-800/70">
            <h3 className="font-semibold text-zinc-800 dark:text-zinc-100">Donation History Preview</h3>
            {donationHistoryPreview.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">No donation records yet.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {donationHistoryPreview.map((donation) => (
                  <li key={donation.id} className="flex items-center justify-between gap-3">
                    <span className="text-zinc-700 dark:text-zinc-200">{donation.purpose}</span>
                    <span className="font-bold text-orange-800 dark:text-orange-200">
                      {formatCurrency(donation.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {pendingPaymentIntents.length > 0 && (
            <div className="mt-4 rounded-xl border border-orange-100 bg-orange-50/60 p-4 text-sm dark:border-orange-900/40 dark:bg-zinc-800/70">
              <p className="font-semibold text-orange-900 dark:text-orange-200">Pending / Submitted Payment Intents</p>
              <p className="mt-1 text-zinc-700 dark:text-zinc-300">{pendingPaymentIntents.length} item(s)</p>
            </div>
          )}
        </Card>
      </div>

      <Modal
        title={needsProofSubmission ? 'Complete Your Donation' : 'Donation Submitted'}
        open={isConfirmationOpen}
        onClose={closeConfirmation}
        disableClose={needsProofSubmission}
      >
        {latestDonation && (
          <div className="space-y-4 text-sm text-zinc-700 dark:text-zinc-200">
            <p>
              Payment intent created for{' '}
              <strong className="text-orange-800 dark:text-orange-200">{formatCurrency(latestDonation.amount)}</strong>.
            </p>
            <p><strong>Purpose:</strong> {latestDonation.purpose}</p>
            <p><strong>Gateway:</strong> {latestDonation.paymentMethod}</p>
            <p><strong>Date:</strong> {formatDate(latestDonation.date)}</p>

            {latestDonation.instructions?.upiLink && (
              <div className="space-y-3 rounded-xl border border-orange-200 bg-orange-50/70 p-4 dark:border-orange-900/40 dark:bg-zinc-800/80">
                <p className="font-semibold text-orange-900 dark:text-orange-200">UPI Payment</p>
                <p>Choose a UPI app below to continue payment.</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {upiPaymentOptions.map((option) => (
                    <a
                      key={option.id}
                      href={option.href}
                      className="focus-ring rounded-lg border border-orange-300 bg-white px-3 py-2 text-center font-semibold text-orange-900 transition hover:bg-orange-100 dark:border-orange-800 dark:bg-zinc-900 dark:text-orange-200 dark:hover:bg-zinc-700"
                    >
                      {option.label}
                    </a>
                  ))}
                </div>
                {platformFlags.isDesktop && latestDonation.instructions?.upiQrDataUrl && (
                  <div className="rounded-lg border border-orange-200 bg-white p-3 text-center dark:border-orange-900/40 dark:bg-zinc-900">
                    <p className="mb-2 font-semibold text-zinc-800 dark:text-zinc-100">Scan QR from your UPI app</p>
                    <img
                      src={latestDonation.instructions.upiQrDataUrl}
                      alt="UPI payment QR code"
                      className="mx-auto h-56 w-56 rounded-lg border border-orange-100 bg-white p-2 dark:border-orange-900/40"
                    />
                  </div>
                )}
                <p className="break-all rounded-lg bg-white px-3 py-2 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
                  UPI Link: {latestDonation.instructions.upiLink}
                </p>
              </div>
            )}

            {latestDonation.instructions?.bankTransfer && (
              <div className="rounded-lg bg-white px-3 py-2 dark:bg-zinc-800">
                <p className="font-semibold">Bank Transfer</p>
                <p>{latestDonation.instructions.bankTransfer.payeeName}</p>
                <p>{latestDonation.instructions.bankTransfer.bankName}</p>
                <p>A/C: {latestDonation.instructions.bankTransfer.accountNumber}</p>
                <p>IFSC: {latestDonation.instructions.bankTransfer.ifsc}</p>
              </div>
            )}

            <form
              className="space-y-3 rounded-xl border border-orange-200 bg-white p-4 dark:border-orange-900/40 dark:bg-zinc-800/80"
              onSubmit={handleProofSubmit}
            >
              <p className="font-semibold text-zinc-800 dark:text-zinc-100">Submit Proof of Payment (Required)</p>
              <p className="text-xs text-zinc-600 dark:text-zinc-300">
                After payment, enter your payer name and UTR / transaction reference.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">Payer Name</span>
                  <input
                    value={proofForm.payerName}
                    onChange={(event) => setProofForm((current) => ({ ...current, payerName: event.target.value }))}
                    className="focus-ring w-full rounded-lg border border-orange-200 bg-white px-3 py-2 dark:border-orange-900/40 dark:bg-zinc-900"
                    placeholder="Name used during payment"
                    required
                  />
                </label>
                <label className="space-y-1">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">UTR / Txn ID</span>
                  <input
                    value={proofForm.payerUtr}
                    onChange={(event) => setProofForm((current) => ({ ...current, payerUtr: event.target.value }))}
                    className="focus-ring w-full rounded-lg border border-orange-200 bg-white px-3 py-2 dark:border-orange-900/40 dark:bg-zinc-900"
                    placeholder="Enter UTR or reference number"
                    minLength={8}
                    required
                  />
                </label>
              </div>

              {proofError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-200">
                  {proofError}
                </p>
              )}

              {proofSuccess && (
                <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
                  {proofSuccess}
                </p>
              )}

              {!latestDonation.proofSubmitted && (
                <button
                  type="submit"
                  className="focus-ring rounded-lg bg-gradient-to-r from-orange-600 to-amber-500 px-4 py-2 font-semibold text-white transition hover:brightness-105"
                >
                  Submit Proof
                </button>
              )}

              {latestDonation.proofSubmitted && (
                <button
                  type="button"
                  onClick={closeConfirmation}
                  className="focus-ring rounded-lg border border-orange-300 px-4 py-2 font-semibold text-orange-900 dark:border-orange-800 dark:text-orange-200"
                >
                  Close
                </button>
              )}
            </form>
          </div>
        )}
      </Modal>
    </div>
  )
}
