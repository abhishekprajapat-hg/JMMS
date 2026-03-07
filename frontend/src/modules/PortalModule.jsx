import { useEffect, useState } from 'react'
import { apiRequest, toAbsoluteUrl } from '../services/api'
import { formatCurrency, formatDate, toISODate } from '../utils/validation'

function getInitialAccessForm(families) {
  return {
    familyId: families[0]?.familyId || '',
    whatsapp: '',
  }
}

export function PortalModule({ authToken, families, onNotice }) {
  const [loading, setLoading] = useState(false)
  const [accessForm, setAccessForm] = useState(() => getInitialAccessForm(families))
  const [summary, setSummary] = useState(null)
  const [slots, setSlots] = useState([])
  const [gateways, setGateways] = useState([])
  const [paymentPortal, setPaymentPortal] = useState({
    upiVpa: '',
    payeeName: '',
    bankName: '',
    accountNumber: '',
    ifsc: '',
  })
  const [latestInstructions, setLatestInstructions] = useState(null)
  const [bookingForm, setBookingForm] = useState({
    date: toISODate(),
    slot: '',
    notes: '',
  })
  const [paymentForm, setPaymentForm] = useState({
    linkedTransactionId: '',
    amount: '',
    gateway: '',
    note: 'Self-service no-commission donation',
  })
  const [proofForm, setProofForm] = useState({
    paymentId: '',
    payerUtr: '',
    payerName: '',
  })

  useEffect(() => {
    setAccessForm((current) => ({
      ...current,
      familyId:
        current.familyId && families.some((family) => family.familyId === current.familyId)
          ? current.familyId
          : families[0]?.familyId || '',
    }))
  }, [families])

  useEffect(() => {
    const pendingIntent = (summary?.paymentIntents || []).find((intent) =>
      ['Pending', 'Proof Submitted'].includes(intent.status),
    )
    setProofForm((current) => ({
      ...current,
      paymentId:
        current.paymentId && (summary?.paymentIntents || []).some((intent) => intent.id === current.paymentId)
          ? current.paymentId
          : pendingIntent?.id || '',
    }))
  }, [summary])

  async function loadSession() {
    if (!accessForm.familyId || !accessForm.whatsapp) {
      onNotice('error', 'Family ID and WhatsApp are required for self-service access.')
      return
    }

    setLoading(true)
    try {
      const response = await apiRequest('/portal/session', {
        method: 'POST',
        token: authToken,
        body: {
          familyId: accessForm.familyId,
          whatsapp: accessForm.whatsapp,
        },
      })
      setSummary(response.summary)
      setSlots(response.poojaSlots || [])
      setGateways(response.paymentGateways || [])
      setPaymentPortal((current) => ({
        ...current,
        ...(response.paymentPortal || {}),
      }))
      setBookingForm((current) => ({
        ...current,
        slot: response.poojaSlots?.[0] || '',
      }))
      setPaymentForm((current) => ({
        ...current,
        gateway: response.paymentGateways?.[0] || '',
      }))
    } catch (error) {
      onNotice('error', error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleAccessSubmit(event) {
    event.preventDefault()
    await loadSession()
  }

  async function handleBookingSubmit(event) {
    event.preventDefault()
    if (!summary?.family?.familyId) return

    setLoading(true)
    try {
      const response = await apiRequest('/portal/bookings', {
        method: 'POST',
        token: authToken,
        body: {
          familyId: summary.family.familyId,
          date: bookingForm.date,
          slot: bookingForm.slot,
          notes: bookingForm.notes,
        },
      })
      onNotice('success', `Portal booking created (${response.booking.id}).`)
      setBookingForm((current) => ({ ...current, notes: '' }))
      await loadSession()
    } catch (error) {
      onNotice('error', error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handlePaymentIntentSubmit(event) {
    event.preventDefault()
    if (!summary?.family?.familyId) return

    if (!paymentForm.gateway || !paymentForm.amount) {
      onNotice('error', 'Collection mode and amount are required.')
      return
    }

    setLoading(true)
    try {
      const response = await apiRequest('/portal/payments/intents', {
        method: 'POST',
        token: authToken,
        body: {
          familyId: summary.family.familyId,
          linkedTransactionId: paymentForm.linkedTransactionId,
          amount: Number(paymentForm.amount),
          gateway: paymentForm.gateway,
          note: paymentForm.note,
        },
      })
      setLatestInstructions({
        paymentId: response.paymentIntent.id,
        paymentLink: response.paymentLink,
        upiLink: response.upiLink,
        upiQrDataUrl: response.upiQrDataUrl,
        bankTransfer: response.bankTransfer,
      })
      onNotice('success', `Portal payment intent ${response.paymentIntent.id} created.`)
      setProofForm((current) => ({ ...current, paymentId: response.paymentIntent.id }))
      setPaymentForm((current) => ({
        ...current,
        linkedTransactionId: '',
        amount: '',
      }))
      await loadSession()
    } catch (error) {
      onNotice('error', error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleProofSubmit(event) {
    event.preventDefault()
    if (!summary?.family?.familyId) return

    if (!proofForm.paymentId || !proofForm.payerUtr) {
      onNotice('error', 'Payment ID and UTR are required.')
      return
    }

    setLoading(true)
    try {
      const response = await apiRequest(`/portal/payments/${proofForm.paymentId}/proof`, {
        method: 'POST',
        token: authToken,
        body: {
          familyId: summary.family.familyId,
          payerUtr: proofForm.payerUtr,
          payerName: proofForm.payerName,
        },
      })
      onNotice('success', `Proof submitted for ${response.paymentIntent.id}.`) 
      setProofForm((current) => ({ ...current, payerUtr: '', payerName: '' }))
      await loadSession()
    } catch (error) {
      onNotice('error', error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="panel-grid two-column">
      <article className="panel">
        <div className="panel-head">
          <h2>Devotee Self-Service Portal</h2>
          <p>Authenticate family by WhatsApp, then run self-service flows from a kiosk-style screen.</p>
        </div>

        <form className="stack-form" onSubmit={handleAccessSubmit}>
          <label>
            Family
            <select
              value={accessForm.familyId}
              onChange={(event) => setAccessForm((current) => ({ ...current, familyId: event.target.value }))}
            >
              {families.map((family) => (
                <option key={family.familyId} value={family.familyId}>
                  {family.familyId} - {family.headName}
                </option>
              ))}
            </select>
          </label>

          <label>
            WhatsApp Verification (+91...)
            <input
              value={accessForm.whatsapp}
              onChange={(event) => setAccessForm((current) => ({ ...current, whatsapp: event.target.value }))}
              placeholder="+919876543210"
            />
          </label>

          <button type="submit" disabled={loading}>Open Portal Session</button>
        </form>

        {summary && (
          <div className="stats-inline">
            <div>
              <span>Lifetime Contributions</span>
              <strong>{formatCurrency(summary.stats.lifetimeContributions)}</strong>
            </div>
            <div>
              <span>Pending Pledges</span>
              <strong>{formatCurrency(summary.stats.pendingAmount)}</strong>
            </div>
          </div>
        )}
      </article>

      <article className="panel">
        <div className="panel-head">
          <h2>Family Ledger & Receipts</h2>
          <p>
            {summary?.family
              ? `${summary.family.familyId} - ${summary.family.headName}`
              : 'Open a portal session to continue.'}
          </p>
        </div>

        {summary && (
          <>
            <div className="table-wrap compact">
              <table>
                <thead>
                  <tr>
                    <th>Receipt TXN</th>
                    <th>Fund</th>
                    <th>Amount</th>
                    <th>Date</th>
                    <th>Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.receipts.length === 0 && (
                    <tr>
                      <td colSpan="5">No receipts yet.</td>
                    </tr>
                  )}
                  {summary.receipts.map((receipt) => (
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

            <form className="stack-form" onSubmit={handleBookingSubmit}>
              <h3>Portal Pooja Booking</h3>
              <label>
                Date
                <input
                  type="date"
                  value={bookingForm.date}
                  onChange={(event) => setBookingForm((current) => ({ ...current, date: event.target.value }))}
                />
              </label>
              <label>
                Slot
                <select
                  value={bookingForm.slot}
                  onChange={(event) => setBookingForm((current) => ({ ...current, slot: event.target.value }))}
                >
                  {slots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Notes
                <input
                  value={bookingForm.notes}
                  onChange={(event) => setBookingForm((current) => ({ ...current, notes: event.target.value }))}
                />
              </label>
              <button type="submit" disabled={loading}>Create Portal Booking</button>
            </form>

            <form className="stack-form" onSubmit={handlePaymentIntentSubmit}>
              <h3>Create No-Commission Payment</h3>
              <label>
                Pending Transaction
                <select
                  value={paymentForm.linkedTransactionId}
                  onChange={(event) => {
                    const transactionId = event.target.value
                    const linked = summary.pendingPledges.find((item) => item.id === transactionId)
                    setPaymentForm((current) => ({
                      ...current,
                      linkedTransactionId: transactionId,
                      amount: linked ? String(linked.amount) : current.amount,
                    }))
                  }}
                >
                  <option value="">No linked pledge</option>
                  {summary.pendingPledges.map((pledge) => (
                    <option key={pledge.id} value={pledge.id}>
                      {pledge.id} - {formatCurrency(pledge.amount)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Collection Mode
                <select
                  value={paymentForm.gateway}
                  onChange={(event) => setPaymentForm((current) => ({ ...current, gateway: event.target.value }))}
                >
                  {gateways.map((gateway) => (
                    <option key={gateway} value={gateway}>
                      {gateway}
                    </option>
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
              <button type="submit" disabled={loading}>Generate Payment Instructions</button>
            </form>

            {latestInstructions && (
              <div className="stack-form">
                <h3>Payment Instructions ({latestInstructions.paymentId})</h3>
                {latestInstructions.upiLink ? (
                  <>
                    <p className="hint">UPI VPA: {paymentPortal.upiVpa || '-'}</p>
                    <p className="hint">UPI Link: {latestInstructions.upiLink}</p>
                    {latestInstructions.upiQrDataUrl && (
                      <img src={latestInstructions.upiQrDataUrl} alt="UPI QR" style={{ width: '180px', height: '180px' }} />
                    )}
                  </>
                ) : (
                  <>
                    <p className="hint">Bank: {latestInstructions.bankTransfer?.bankName || paymentPortal.bankName || '-'}</p>
                    <p className="hint">A/C: {latestInstructions.bankTransfer?.accountNumber || paymentPortal.accountNumber || '-'}</p>
                    <p className="hint">IFSC: {latestInstructions.bankTransfer?.ifsc || paymentPortal.ifsc || '-'}</p>
                  </>
                )}
              </div>
            )}

            <form className="stack-form" onSubmit={handleProofSubmit}>
              <h3>Submit UTR Proof</h3>
              <label>
                Payment Intent
                <select
                  value={proofForm.paymentId}
                  onChange={(event) => setProofForm((current) => ({ ...current, paymentId: event.target.value }))}
                >
                  {(summary.paymentIntents || [])
                    .filter((intent) => ['Pending', 'Proof Submitted'].includes(intent.status))
                    .map((intent) => (
                      <option key={intent.id} value={intent.id}>
                        {intent.id} - {formatCurrency(intent.amount)}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                UTR / Reference
                <input
                  value={proofForm.payerUtr}
                  onChange={(event) => setProofForm((current) => ({ ...current, payerUtr: event.target.value }))}
                />
              </label>
              <label>
                Payer Name (optional)
                <input
                  value={proofForm.payerName}
                  onChange={(event) => setProofForm((current) => ({ ...current, payerName: event.target.value }))}
                />
              </label>
              <button type="submit" disabled={loading}>Submit UTR Proof</button>
            </form>

            <div className="table-wrap compact">
              <table>
                <thead>
                  <tr>
                    <th>Payment ID</th>
                    <th>Amount</th>
                    <th>Mode</th>
                    <th>Status</th>
                    <th>UTR</th>
                    <th>Linked TXN</th>
                    <th>Initiated</th>
                  </tr>
                </thead>
                <tbody>
                  {(summary.paymentIntents || []).length === 0 && (
                    <tr>
                      <td colSpan="7">No payment intents raised for this family.</td>
                    </tr>
                  )}
                  {(summary.paymentIntents || []).map((intent) => (
                    <tr key={intent.id}>
                      <td>{intent.id}</td>
                      <td>{formatCurrency(intent.amount)}</td>
                      <td>{intent.gateway}</td>
                      <td>{intent.status}</td>
                      <td>{intent.payerUtr || '-'}</td>
                      <td>{intent.linkedTransactionId || '-'}</td>
                      <td>{formatDate(intent.initiatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </article>
    </section>
  )
}
