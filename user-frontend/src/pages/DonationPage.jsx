import { useEffect, useState } from 'react'
import { formatCurrency, formatDate, toAbsoluteUrl } from '../api'
import { usePortal } from '../context/usePortal'

const FALLBACK_TRANSACTION_TYPES = ['Daan', 'Bhent', 'Gupt Daan', 'Boli']
const FALLBACK_FUND_CATEGORIES = ['Mandir Nirman', 'Shanti Dhara', 'Jiv Daya', 'Aahar Daan', 'General Fund']

function getInitialPaymentForm(userData) {
  const transactionTypes = userData?.transactionTypes?.length
    ? userData.transactionTypes
    : FALLBACK_TRANSACTION_TYPES
  const fundCategories = userData?.fundCategories?.length
    ? userData.fundCategories
    : FALLBACK_FUND_CATEGORIES

  return {
    linkedTransactionId: '',
    transactionType: transactionTypes[0] || 'Bhent',
    fundCategory: fundCategories[0] || 'General Fund',
    amount: '',
    gateway: userData?.paymentGateways?.[0] || '',
    note: 'Self-service donation from devotee profile',
  }
}

function getInitialProofForm(userData) {
  const pendingIntent = (userData?.summary?.paymentIntents || []).find((intent) =>
    ['Pending', 'Proof Submitted'].includes(intent.status),
  )
  return {
    paymentId: pendingIntent?.id || '',
    payerUtr: '',
    payerName: '',
  }
}

function buildUpiAppLinks(upiLink) {
  if (!upiLink) return []
  const queryIndex = upiLink.indexOf('?')
  const query = queryIndex >= 0 ? upiLink.slice(queryIndex + 1) : ''
  if (!query) {
    return [{ label: 'Any UPI App', href: upiLink }]
  }

  return [
    { label: 'Any UPI App', href: upiLink },
    { label: 'Google Pay', href: `tez://upi/pay?${query}` },
    { label: 'PhonePe', href: `phonepe://pay?${query}` },
    { label: 'Paytm', href: `paytmmp://pay?${query}` },
    { label: 'BHIM UPI', href: `bhim://upi/pay?${query}` },
  ]
}

function detectDesktopViewport() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true
  return window.matchMedia('(min-width: 960px) and (hover: hover) and (pointer: fine)').matches
}

export function DonationPage() {
  const {
    userData,
    working,
    createPaymentIntent,
    submitPaymentProof,
  } = usePortal()
  const [paymentForm, setPaymentForm] = useState(() => getInitialPaymentForm(userData))
  const [proofForm, setProofForm] = useState(() => getInitialProofForm(userData))
  const [latestInstructions, setLatestInstructions] = useState(null)
  const [isDesktop, setIsDesktop] = useState(detectDesktopViewport)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined
    const media = window.matchMedia('(min-width: 960px) and (hover: hover) and (pointer: fine)')
    const handleChange = (event) => setIsDesktop(event.matches)

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', handleChange)
      return () => media.removeEventListener('change', handleChange)
    }

    media.addListener(handleChange)
    return () => media.removeListener(handleChange)
  }, [])

  if (!userData) {
    return (
      <section className="panel ring-1 ring-amber-100/60">
        <p>Loading donation page...</p>
      </section>
    )
  }

  const summary = userData.summary || {}
  const transactionTypes = userData.transactionTypes?.length
    ? userData.transactionTypes
    : FALLBACK_TRANSACTION_TYPES
  const fundCategories = userData.fundCategories?.length
    ? userData.fundCategories
    : FALLBACK_FUND_CATEGORIES
  const paymentGatewayValue = paymentForm.gateway || userData?.paymentGateways?.[0] || ''
  const transactionTypeValue = paymentForm.transactionType || transactionTypes[0] || 'Bhent'
  const fundCategoryValue = paymentForm.fundCategory || fundCategories[0] || 'General Fund'
  const fallbackPendingIntent = (summary?.paymentIntents || []).find((intent) =>
    ['Pending', 'Proof Submitted'].includes(intent.status),
  )
  const paymentIdValue = proofForm.paymentId || fallbackPendingIntent?.id || ''
  const upiAppLinks = buildUpiAppLinks(latestInstructions?.upiLink)

  async function handlePaymentIntentSubmit(event) {
    event.preventDefault()
    if (!paymentGatewayValue || !paymentForm.amount || !transactionTypeValue || !fundCategoryValue) return
    const response = await createPaymentIntent({
      ...paymentForm,
      gateway: paymentGatewayValue,
      transactionType: transactionTypeValue,
      fundCategory: fundCategoryValue,
    })
    if (response) {
      setLatestInstructions({
        paymentId: response.paymentIntent.id,
        transactionType: response.paymentIntent.transactionType || transactionTypeValue,
        fundCategory: response.paymentIntent.fundCategory || fundCategoryValue,
        amount: response.paymentIntent.amount || Number(paymentForm.amount) || 0,
        preferredGateway: response.preferredGateway,
        paymentLink: response.paymentLink,
        upiLink: response.upiLink,
        upiQrDataUrl: response.upiQrDataUrl,
        bankTransfer: response.bankTransfer,
      })
      setProofForm((current) => ({ ...current, paymentId: response.paymentIntent.id }))
      setPaymentForm((current) => ({
        ...current,
        linkedTransactionId: '',
        amount: '',
      }))
    }
  }

  async function handleProofSubmit(event) {
    event.preventDefault()
    if (!paymentIdValue || !proofForm.payerUtr) return
    const response = await submitPaymentProof({
      ...proofForm,
      paymentId: paymentIdValue,
    })
    if (response) {
      setProofForm((current) => ({ ...current, payerUtr: '', payerName: '' }))
    }
  }

  return (
    <section className="profile-stack pb-2">
      <article className="panel ring-1 ring-amber-100/60">
        <div className="panel-head split gap-3">
          <div>
            <h2>Donation</h2>
            <p>Select daan type, choose fund category, pay via UPI, then submit UTR proof for admin verification.</p>
          </div>
          <div className="chip-row items-center">
            <span className="chip">Family: {summary?.family?.familyId || '-'}</span>
          </div>
        </div>
      </article>

      <section className="content-grid items-start">
        <article className="panel ring-1 ring-amber-100/60">
          <h3>Step 1: Donation Details</h3>
          <form className="stack-form" onSubmit={handlePaymentIntentSubmit}>
            <label>
              Transaction Type
              <select
                value={transactionTypeValue}
                onChange={(event) => setPaymentForm((current) => ({ ...current, transactionType: event.target.value }))}
              >
                {transactionTypes.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              Fund Category
              <select
                value={fundCategoryValue}
                onChange={(event) => setPaymentForm((current) => ({ ...current, fundCategory: event.target.value }))}
              >
                {fundCategories.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              Amount (INR)
              <input
                type="number"
                min="1"
                value={paymentForm.amount}
                onChange={(event) => setPaymentForm((current) => ({ ...current, amount: event.target.value }))}
              />
            </label>
            <label>
              Linked Pending Pledge
              <select
                value={paymentForm.linkedTransactionId}
                onChange={(event) => {
                  const linkedId = event.target.value
                  const linked = (summary?.pendingPledges || []).find((item) => item.id === linkedId)
                  setPaymentForm((current) => ({
                    ...current,
                    linkedTransactionId: linkedId,
                    amount: linked ? String(linked.amount) : current.amount,
                  }))
                }}
              >
                <option value="">No linked pledge</option>
                {(summary?.pendingPledges || []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.id} - {formatCurrency(item.amount)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Payment Mode
              <select
                value={paymentGatewayValue}
                onChange={(event) => setPaymentForm((current) => ({ ...current, gateway: event.target.value }))}
              >
                {(userData.paymentGateways || []).map((gateway) => (
                  <option key={gateway} value={gateway}>{gateway}</option>
                ))}
              </select>
            </label>
            <button className="w-full sm:w-auto" type="submit" disabled={working}>Go Ahead</button>
          </form>

          {latestInstructions && (
            <div className="instruction-box donation-step-box space-y-1">
              <h4>Step 2: Payment Options</h4>
              <strong>Payment ID: {latestInstructions.paymentId}</strong>
              <p><strong>Transaction:</strong> {latestInstructions.transactionType || '-'}</p>
              <p><strong>Fund:</strong> {latestInstructions.fundCategory || '-'}</p>
              <p><strong>Amount:</strong> {formatCurrency(latestInstructions.amount)}</p>
              <p>Preferred: {latestInstructions.preferredGateway || '-'}</p>

              {latestInstructions.upiLink ? (
                <>
                  <p><strong>Choose UPI App:</strong></p>
                  <div className="payment-option-grid">
                    {upiAppLinks.map((option) => (
                      <a key={option.label} className="payment-option-link" href={option.href}>{option.label}</a>
                    ))}
                  </div>
                  <p><strong>UPI Intent:</strong> {latestInstructions.upiLink}</p>
                  {isDesktop && latestInstructions.upiQrDataUrl ? (
                    <img src={latestInstructions.upiQrDataUrl} alt="UPI QR" className="qr-preview mx-auto sm:mx-0" />
                  ) : (
                    <p>Mobile device detected. UPI app buttons use karke payment complete karein.</p>
                  )}
                </>
              ) : (
                <p>UPI is not configured for this mandir.</p>
              )}

              {latestInstructions.bankTransfer ? (
                <>
                  <p><strong>Bank:</strong> {latestInstructions.bankTransfer.bankName || '-'}</p>
                  <p><strong>A/C:</strong> {latestInstructions.bankTransfer.accountNumber || '-'}</p>
                  <p><strong>IFSC:</strong> {latestInstructions.bankTransfer.ifsc || '-'}</p>
                  <p><strong>Payee:</strong> {latestInstructions.bankTransfer.payeeName || '-'}</p>
                </>
              ) : (
                <p>Bank transfer details are not configured for this mandir.</p>
              )}

              <div className="process-note">
                <p><strong>Step 3:</strong> Payment hone ke baad niche UTR proof submit karein.</p>
                <p><strong>Step 4:</strong> Admin UTR verify karega; successful verify par WhatsApp receipt bheji jayegi.</p>
              </div>
            </div>
          )}
        </article>

        <article className="panel ring-1 ring-amber-100/60">
          <h3>Submit Payment Proof</h3>
          <form className="stack-form" onSubmit={handleProofSubmit}>
            <label>
              Payment Intent
              <select
                value={paymentIdValue}
                onChange={(event) => setProofForm((current) => ({ ...current, paymentId: event.target.value }))}
              >
                {(summary?.paymentIntents || [])
                  .filter((intent) => ['Pending', 'Proof Submitted'].includes(intent.status))
                  .map((intent) => (
                    <option key={intent.id} value={intent.id}>
                      {intent.id} - {formatCurrency(intent.amount)}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              UTR / Bank Reference
              <input
                value={proofForm.payerUtr}
                onChange={(event) => setProofForm((current) => ({ ...current, payerUtr: event.target.value }))}
              />
            </label>
            <label>
              Payer Name
              <input
                value={proofForm.payerName}
                onChange={(event) => setProofForm((current) => ({ ...current, payerName: event.target.value }))}
              />
            </label>
            <button className="w-full sm:w-auto" type="submit" disabled={working}>Submit Proof</button>
          </form>

          <div className="table-wrap rounded-xl">
            <table>
              <thead>
                <tr>
                  <th>Payment ID</th>
                  <th>Amount</th>
                  <th>Transaction</th>
                  <th>Fund</th>
                  <th>Mode</th>
                  <th>Status</th>
                  <th>UTR</th>
                </tr>
              </thead>
              <tbody>
                {(summary?.paymentIntents || []).length === 0 && (
                  <tr><td colSpan="7">No payment intents created yet.</td></tr>
                )}
                {(summary?.paymentIntents || []).map((intent) => (
                  <tr key={intent.id}>
                    <td>{intent.id}</td>
                    <td>{formatCurrency(intent.amount)}</td>
                    <td>{intent.transactionType || '-'}</td>
                    <td>{intent.fundCategory || '-'}</td>
                    <td>{intent.gateway}</td>
                    <td>{intent.status}</td>
                    <td>{intent.payerUtr || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <article className="panel ring-1 ring-amber-100/60">
        <h3>Receipts</h3>
        <div className="table-wrap rounded-xl">
          <table>
            <thead>
              <tr>
                <th>Transaction</th>
                <th>Fund</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Receipt</th>
              </tr>
            </thead>
            <tbody>
              {(summary?.receipts || []).length === 0 && (
                <tr><td colSpan="5">No receipts available yet.</td></tr>
              )}
              {(summary?.receipts || []).map((receipt) => (
                <tr key={receipt.transactionId}>
                  <td>{receipt.transactionId}</td>
                  <td>{receipt.fundCategory}</td>
                  <td>{formatCurrency(receipt.amount)}</td>
                  <td>{formatDate(receipt.paidAt)}</td>
                  <td>
                    {receipt.receiptPath ? (
                      <a href={toAbsoluteUrl(receipt.receiptPath)} target="_blank" rel="noreferrer">View</a>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  )
}
