import { useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../services/api'
import { formatCurrency } from '../utils/validation'

function getInitialForm(families, gateways, transactions) {
  const firstFamilyId = families[0]?.familyId || ''
  const firstGateway = gateways[0] || ''
  const firstPendingTransaction = transactions.find((transaction) => transaction.status === 'Pledged')

  return {
    familyId: firstFamilyId,
    linkedTransactionId: firstPendingTransaction?.id || '',
    amount: firstPendingTransaction?.amount ? String(firstPendingTransaction.amount) : '',
    gateway: firstGateway,
    note: 'Direct no-commission collection',
  }
}

function getInitialPortalConfig() {
  return {
    upiVpa: '',
    payeeName: '',
    bankName: '',
    accountNumber: '',
    ifsc: '',
  }
}

export function PaymentsModule({
  authToken,
  families,
  transactions,
  paymentGateways,
  permissions,
  onNotice,
  onRefreshTransactions,
}) {
  const [intents, setIntents] = useState([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState(() => getInitialForm(families, paymentGateways, transactions))
  const [portalConfig, setPortalConfig] = useState(getInitialPortalConfig)
  const [proofForm, setProofForm] = useState({
    paymentId: '',
    payerUtr: '',
    payerName: '',
  })
  const [latestInstructions, setLatestInstructions] = useState(null)

  const familyLookup = useMemo(
    () => Object.fromEntries(families.map((family) => [family.familyId, family.headName])),
    [families],
  )

  async function loadIntents() {
    if (!authToken) return
    setLoading(true)
    try {
      const response = await apiRequest('/payments', { token: authToken })
      setIntents(response.paymentIntents || [])
      if (response.paymentPortal) {
        setPortalConfig((current) => ({
          ...current,
          ...response.paymentPortal,
        }))
      }
    } catch (error) {
      onNotice('error', error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadIntents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken])

  useEffect(() => {
    setForm((current) => {
      const next = { ...current }
      if (!next.familyId || !families.some((family) => family.familyId === next.familyId)) {
        next.familyId = families[0]?.familyId || ''
      }
      if (!next.gateway || !paymentGateways.includes(next.gateway)) {
        next.gateway = paymentGateways[0] || ''
      }
      return next
    })
  }, [families, paymentGateways])

  useEffect(() => {
    const pendingIntent = intents.find((intent) => ['Pending', 'Proof Submitted'].includes(intent.status))
    setProofForm((current) => ({
      ...current,
      paymentId:
        current.paymentId && intents.some((intent) => intent.id === current.paymentId)
          ? current.paymentId
          : pendingIntent?.id || '',
    }))
  }, [intents])

  async function handleSavePortalConfig(event) {
    event.preventDefault()

    setLoading(true)
    try {
      const response = await apiRequest('/payments/portal-config', {
        method: 'PUT',
        token: authToken,
        body: portalConfig,
      })
      setPortalConfig(response.paymentPortal || getInitialPortalConfig())
      onNotice('success', 'No-commission payment portal config updated.')
    } catch (error) {
      onNotice('error', error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateIntent(event) {
    event.preventDefault()

    if (!form.familyId || !form.gateway || !form.amount) {
      onNotice('error', 'Family, gateway, and amount are required.')
      return
    }

    setLoading(true)
    try {
      const response = await apiRequest('/payments/intents', {
        method: 'POST',
        token: authToken,
        body: {
          familyId: form.familyId,
          linkedTransactionId: form.linkedTransactionId,
          gateway: form.gateway,
          amount: Number(form.amount),
          note: form.note,
          source: 'staff_console',
        },
      })
      setIntents((current) => [response.paymentIntent, ...current])
      setLatestInstructions({
        paymentId: response.paymentIntent.id,
        paymentLink: response.paymentLink,
        upiLink: response.upiLink,
        upiQrDataUrl: response.upiQrDataUrl,
        bankTransfer: response.bankTransfer,
      })
      setForm((current) => ({
        ...current,
        linkedTransactionId: '',
        amount: '',
      }))
      onNotice('success', `Payment intent ${response.paymentIntent.id} created.`)
    } catch (error) {
      onNotice('error', error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmitProof(event) {
    event.preventDefault()

    if (!proofForm.paymentId || !proofForm.payerUtr) {
      onNotice('error', 'Payment ID and UTR are required.')
      return
    }

    setLoading(true)
    try {
      const response = await apiRequest(`/payments/${proofForm.paymentId}/submit-proof`, {
        method: 'POST',
        token: authToken,
        body: {
          payerUtr: proofForm.payerUtr,
          payerName: proofForm.payerName,
        },
      })
      setIntents((current) =>
        current.map((intent) =>
          intent.id === proofForm.paymentId ? response.paymentIntent : intent,
        ),
      )
      setProofForm((current) => ({ ...current, payerUtr: '', payerName: '' }))
      onNotice('success', `Proof submitted for ${response.paymentIntent.id}.`)
    } catch (error) {
      onNotice('error', error.message)
    } finally {
      setLoading(false)
    }
  }

  async function reconcileIntent(paymentId, outcome) {
    setLoading(true)
    try {
      const response = await apiRequest(`/payments/${paymentId}/reconcile`, {
        method: 'POST',
        token: authToken,
        body: {
          outcome,
          providerReference: `UTR-VERIFY-${Date.now()}`,
          failureReason: outcome === 'failed' ? 'Payment proof rejected by reviewer.' : '',
        },
      })
      setIntents((current) =>
        current.map((intent) => (intent.id === paymentId ? response.paymentIntent : intent)),
      )
      if (response.settledTransaction) {
        await onRefreshTransactions()
        const baseMessage = `Payment verified and transaction ${response.settledTransaction.id} settled.`
        const familyName = String(response.whatsappLog?.familyName || '').trim()
        const familyInfo = familyName && familyName !== '-' ? ` Family: ${familyName}.` : ''
        const phone = String(response.whatsappLog?.phone || '').trim()
        const phoneInfo = phone && phone !== '-' ? ` WhatsApp target: ${phone}.` : ''
        if (
          response.whatsappLog?.status &&
          response.whatsappLog.status !== 'Sent' &&
          response.whatsappLog.status !== 'Mock Sent'
        ) {
          const detail = String(response.whatsappLog.detail || '').trim()
          const suffix = detail ? ` (${detail.slice(0, 160)})` : ''
          onNotice(
            'error',
            `${baseMessage}${familyInfo}${phoneInfo} WhatsApp status: ${response.whatsappLog.status}.${suffix}`,
          )
        } else if (response.whatsappLog?.status === 'Sent') {
          onNotice(
            'success',
            `${baseMessage}${familyInfo}${phoneInfo} Meta accepted send request. Delivery confirmation will appear in WhatsApp Logs.`,
          )
        } else {
          onNotice('success', `${baseMessage}${familyInfo}${phoneInfo}`)
        }
      } else {
        onNotice('success', `Payment ${paymentId} marked ${response.paymentIntent.status}.`)
      }
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
          <h2>No-Commission Payment Portal</h2>
          <p>Direct UPI and direct bank transfer collection with UTR proof and internal verification.</p>
        </div>

        {permissions.managePayments && (
          <form className="stack-form" onSubmit={handleSavePortalConfig}>
            <h3>Payee Configuration</h3>
            <label>
              UPI VPA
              <input
                value={portalConfig.upiVpa}
                onChange={(event) => setPortalConfig((current) => ({ ...current, upiVpa: event.target.value }))}
                placeholder="mandir@upi"
              />
            </label>
            <label>
              Payee Name
              <input
                value={portalConfig.payeeName}
                onChange={(event) => setPortalConfig((current) => ({ ...current, payeeName: event.target.value }))}
              />
            </label>
            <label>
              Bank Name
              <input
                value={portalConfig.bankName}
                onChange={(event) => setPortalConfig((current) => ({ ...current, bankName: event.target.value }))}
              />
            </label>
            <label>
              Account Number
              <input
                value={portalConfig.accountNumber}
                onChange={(event) => setPortalConfig((current) => ({ ...current, accountNumber: event.target.value }))}
              />
            </label>
            <label>
              IFSC
              <input
                value={portalConfig.ifsc}
                onChange={(event) => setPortalConfig((current) => ({ ...current, ifsc: event.target.value.toUpperCase() }))}
              />
            </label>
            <button type="submit" disabled={loading}>Save Payee Config</button>
          </form>
        )}

        {permissions.managePayments ? (
          <form className="stack-form" onSubmit={handleCreateIntent}>
            <h3>Create Direct Payment Intent</h3>
            <label>
              Family
              <select
                value={form.familyId}
                onChange={(event) => setForm((current) => ({ ...current, familyId: event.target.value }))}
              >
                {families.map((family) => (
                  <option key={family.familyId} value={family.familyId}>
                    {family.familyId} - {family.headName}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Linked Pledge (optional)
              <select
                value={form.linkedTransactionId}
                onChange={(event) => {
                  const transactionId = event.target.value
                  const transaction = transactions.find((item) => item.id === transactionId)
                  setForm((current) => ({
                    ...current,
                    linkedTransactionId: transactionId,
                    amount: transaction ? String(transaction.amount) : current.amount,
                  }))
                }}
              >
                <option value="">No linked pledge</option>
                {transactions
                  .filter((transaction) => transaction.status === 'Pledged' && !transaction.cancelled)
                  .map((transaction) => (
                    <option key={transaction.id} value={transaction.id}>
                      {transaction.id} - {formatCurrency(transaction.amount)}
                    </option>
                  ))}
              </select>
            </label>

            <label>
              Collection Mode
              <select
                value={form.gateway}
                onChange={(event) => setForm((current) => ({ ...current, gateway: event.target.value }))}
              >
                {paymentGateways.map((gateway) => (
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
                value={form.amount}
                onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
              />
            </label>

            <label>
              Note
              <input
                value={form.note}
                onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
              />
            </label>

            <button type="submit" disabled={loading}>Create Intent</button>
          </form>
        ) : (
          <p className="hint">Your role can reconcile or view direct payment intents.</p>
        )}

        {latestInstructions && (
          <div className="stack-form">
            <h3>Latest Payment Instructions ({latestInstructions.paymentId})</h3>
            {latestInstructions.upiLink ? (
              <>
                <p className="hint">UPI Link: {latestInstructions.upiLink}</p>
                {latestInstructions.upiQrDataUrl && (
                  <img src={latestInstructions.upiQrDataUrl} alt="UPI QR" style={{ width: '180px', height: '180px' }} />
                )}
              </>
            ) : (
              <>
                <p className="hint">Bank: {latestInstructions.bankTransfer?.bankName || '-'}</p>
                <p className="hint">A/C: {latestInstructions.bankTransfer?.accountNumber || '-'}</p>
                <p className="hint">IFSC: {latestInstructions.bankTransfer?.ifsc || '-'}</p>
              </>
            )}
          </div>
        )}
      </article>

      <article className="panel">
        <div className="panel-head">
          <h2>Verification Console</h2>
          <p>Donor submits UTR proof, then staff verifies and auto-closes pledge with receipt.</p>
        </div>

        <form className="stack-form" onSubmit={handleSubmitProof}>
          <h3>Submit UTR Proof</h3>
          <label>
            Payment Intent
            <select
              value={proofForm.paymentId}
              onChange={(event) => setProofForm((current) => ({ ...current, paymentId: event.target.value }))}
            >
              {intents
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
          <button type="submit" disabled={loading}>Submit Proof</button>
        </form>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Payment ID</th>
                <th>Family</th>
                <th>Amount</th>
                <th>Mode</th>
                <th>Status</th>
                <th>UTR</th>
                <th>Linked TXN</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {intents.length === 0 && (
                <tr>
                  <td colSpan="8">No payment intents yet.</td>
                </tr>
              )}
              {intents.map((intent) => (
                <tr key={intent.id}>
                  <td>{intent.id}</td>
                  <td>{familyLookup[intent.familyId] || intent.familyId}</td>
                  <td>{formatCurrency(intent.amount)}</td>
                  <td>{intent.gateway}</td>
                  <td>{intent.status}</td>
                  <td>{intent.payerUtr || '-'}</td>
                  <td>{intent.linkedTransactionId || '-'}</td>
                  <td>
                    {['Pending', 'Proof Submitted'].includes(intent.status) && permissions.reconcilePayments ? (
                      <div className="action-row">
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() => reconcileIntent(intent.id, 'success')}
                          disabled={loading}
                        >
                          Verify + Settle
                        </button>
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() => reconcileIntent(intent.id, 'failed')}
                          disabled={loading}
                        >
                          Reject
                        </button>
                      </div>
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
