import { useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../services/api'
import { formatCurrency } from '../utils/validation'
import { PaymentsSetupPage } from './payments/PaymentsSetupPage'
import { PaymentsProofPage } from './payments/PaymentsProofPage'
import { PaymentsVerificationPage } from './payments/PaymentsVerificationPage'

const PAYMENT_PAGES = [
  { id: 'setup', label: 'Setup & Intent', hint: 'Configure and create' },
  { id: 'proof', label: 'Submit Proof', hint: 'Capture UTR details' },
  { id: 'verification', label: 'Verify Payments', hint: 'Approve or reject' },
]

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

function normalizeText(value) {
  return String(value || '').trim().toLowerCase()
}

function getIntentCategory(intent, { eventTransactionIdSet, transactionLookup }) {
  const linkedTransactionId = String(intent?.linkedTransactionId || '').trim()
  if (!linkedTransactionId) {
    return 'donation'
  }

  if (eventTransactionIdSet.has(linkedTransactionId)) {
    return 'event_registration'
  }

  const note = normalizeText(intent?.note)
  const source = normalizeText(intent?.source)
  if (note.includes('event payment') || note.includes('event registration') || source.includes('event')) {
    return 'event_registration'
  }

  const linkedTransaction = transactionLookup[linkedTransactionId]
  if (normalizeText(linkedTransaction?.type) === 'boli' && note.includes('registration')) {
    return 'event_registration'
  }

  return 'donation'
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
  const [activePage, setActivePage] = useState('setup')
  const [intents, setIntents] = useState([])
  const [eventTransactionIds, setEventTransactionIds] = useState([])
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
  const transactionLookup = useMemo(
    () => Object.fromEntries(transactions.map((transaction) => [transaction.id, transaction])),
    [transactions],
  )
  const eventTransactionIdSet = useMemo(() => new Set(eventTransactionIds), [eventTransactionIds])
  const enrichedIntents = useMemo(
    () =>
      intents.map((intent) => ({
        ...intent,
        paymentCategory: getIntentCategory(intent, { eventTransactionIdSet, transactionLookup }),
      })),
    [intents, eventTransactionIdSet, transactionLookup],
  )
  const eventRegistrationIntents = useMemo(
    () => enrichedIntents.filter((intent) => intent.paymentCategory === 'event_registration'),
    [enrichedIntents],
  )
  const donationIntents = useMemo(
    () => enrichedIntents.filter((intent) => intent.paymentCategory !== 'event_registration'),
    [enrichedIntents],
  )
  const pendingEventIntents = useMemo(
    () => eventRegistrationIntents.filter((intent) => ['Pending', 'Proof Submitted'].includes(intent.status)),
    [eventRegistrationIntents],
  )
  const pendingDonationIntents = useMemo(
    () => donationIntents.filter((intent) => ['Pending', 'Proof Submitted'].includes(intent.status)),
    [donationIntents],
  )
  const pendingIntents = useMemo(
    () => [...pendingEventIntents, ...pendingDonationIntents],
    [pendingEventIntents, pendingDonationIntents],
  )
  const proofSubmittedCount = useMemo(
    () => enrichedIntents.filter((intent) => intent.status === 'Proof Submitted').length,
    [enrichedIntents],
  )
  const successCount = useMemo(
    () => enrichedIntents.filter((intent) => intent.status === 'Success').length,
    [enrichedIntents],
  )
  const failedCount = useMemo(
    () => enrichedIntents.filter((intent) => intent.status === 'Failed').length,
    [enrichedIntents],
  )
  const totalSettledAmount = useMemo(
    () =>
      enrichedIntents
        .filter((intent) => intent.status === 'Success')
        .reduce((sum, intent) => sum + (Number(intent.amount) || 0), 0),
    [enrichedIntents],
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

  async function loadEventRegistrationTransactionIds() {
    if (!authToken) return
    try {
      const response = await apiRequest('/events', { token: authToken })
      const ids = (response.registrations || [])
        .map((registration) => String(registration.transactionId || '').trim())
        .filter(Boolean)
      setEventTransactionIds(ids)
    } catch {
      setEventTransactionIds([])
    }
  }

  useEffect(() => {
    loadIntents()
    loadEventRegistrationTransactionIds()
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
    const pendingIntent = pendingIntents[0]
    setProofForm((current) => ({
      ...current,
      paymentId:
        current.paymentId && intents.some((intent) => intent.id === current.paymentId)
          ? current.paymentId
          : pendingIntent?.id || '',
    }))
  }, [intents, pendingIntents])

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
        preferredGateway: response.preferredGateway,
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
      await loadEventRegistrationTransactionIds()
      onNotice('success', `Proof submitted for ${response.paymentIntent.id}.`)
    } catch (error) {
      onNotice('error', error.message)
    } finally {
      setLoading(false)
    }
  }

  async function reconcileIntent(paymentId, outcome) {
    const intent = intents.find((item) => item.id === paymentId)
    setLoading(true)
    try {
      const response = await apiRequest(`/payments/${paymentId}/reconcile`, {
        method: 'POST',
        token: authToken,
        body: {
          outcome,
          providerReference: intent?.payerUtr || `UTR-VERIFY-${Date.now()}`,
          transactionType: intent?.transactionType || '',
          fundCategory: intent?.fundCategory || '',
          failureReason: outcome === 'failed' ? 'Payment proof rejected by reviewer.' : '',
        },
      })
      setIntents((current) =>
        current.map((currentIntent) => (currentIntent.id === paymentId ? response.paymentIntent : currentIntent)),
      )
      await loadEventRegistrationTransactionIds()
      if (response.settledTransaction) {
        await onRefreshTransactions()
        const targetPhone = String(response.whatsappLog?.phone || '').trim()
        const providerMessageId = String(response.whatsappLog?.providerMessageId || '').trim()
        const sentMeta = [targetPhone ? `to ${targetPhone}` : '', providerMessageId ? `message ${providerMessageId}` : '']
          .filter(Boolean)
          .join(', ')
        const sentSuffix = sentMeta ? ` (${sentMeta})` : ''
        if (response.whatsappLog?.status && response.whatsappLog.status !== 'Sent') {
          const detail = String(response.whatsappLog.detail || '').trim()
          const suffix = detail ? ` (${detail.slice(0, 160)})` : ''
          onNotice(
            'error',
            `Payment verified and transaction ${response.settledTransaction.id} settled, but devotee WhatsApp receipt could not be sent.${suffix}`,
          )
        } else {
          onNotice(
            'success',
            `Payment verified and transaction ${response.settledTransaction.id} settled. Receipt handoff accepted on WhatsApp${sentSuffix}.`,
          )
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

  async function resendReceipt(paymentId) {
    setLoading(true)
    try {
      const response = await apiRequest(`/payments/${paymentId}/resend-receipt`, {
        method: 'POST',
        token: authToken,
      })
      await onRefreshTransactions()
      const targetPhone = String(response.whatsappLog?.phone || '').trim()
      const providerMessageId = String(response.whatsappLog?.providerMessageId || '').trim()
      const sentMeta = [targetPhone ? `to ${targetPhone}` : '', providerMessageId ? `message ${providerMessageId}` : '']
        .filter(Boolean)
        .join(', ')
      const sentSuffix = sentMeta ? ` (${sentMeta})` : ''
      if (response.whatsappLog?.status && response.whatsappLog.status !== 'Sent') {
        const detail = String(response.whatsappLog.detail || '').trim()
        const suffix = detail ? ` (${detail.slice(0, 160)})` : ''
        onNotice(
          'error',
          `Receipt resend attempted for transaction ${response.settledTransaction?.id || '-'}, but WhatsApp could not be sent.${suffix}`,
        )
      } else {
        onNotice(
          'success',
          `Receipt resend accepted for transaction ${response.settledTransaction?.id || '-'}${sentSuffix}.`,
        )
      }
    } catch (error) {
      onNotice('error', error.message)
    } finally {
      setLoading(false)
    }
  }

  function getPageCount(pageId) {
    if (pageId === 'setup') return intents.length
    if (pageId === 'proof') return pendingIntents.length
    if (pageId === 'verification') return proofSubmittedCount
    return 0
  }

  const activePageHint =
    activePage === 'setup'
      ? 'Configure payee channels and create payment intents quickly.'
      : activePage === 'proof'
        ? 'Collect UTR evidence and push entries into reviewer queue.'
        : 'Review event and donation queues separately, then approve or reject.'

  return (
    <section className="panel-grid payments-page-layout">
      <article className="panel payments-shell">
        <div className="payments-shell-head">
          <div className="panel-head">
            <h2>Payments Command Center</h2>
            <p>Focused workspace for setup, proof collection, and final verification.</p>
          </div>
          <div className="payments-live-state">
            <span className={`payments-live-dot${loading ? ' is-loading' : ''}`} />
            <span>{loading ? 'Refreshing...' : 'Live status sync on'}</span>
          </div>
        </div>

        <div className="payments-overview-grid">
          <div className="payments-overview-card">
            <span>Total Intents</span>
            <strong>{intents.length}</strong>
            <small>all payment records</small>
          </div>
          <div className="payments-overview-card is-warning">
            <span>Pending Actions</span>
            <strong>{pendingIntents.length}</strong>
            <small>{proofSubmittedCount} proof-submitted</small>
          </div>
          <div className="payments-overview-card is-success">
            <span>Settled Amount</span>
            <strong>{formatCurrency(totalSettledAmount)}</strong>
            <small>{successCount} successful payments</small>
          </div>
          <div className="payments-overview-card is-muted">
            <span>Failed Payments</span>
            <strong>{failedCount}</strong>
            <small>requires follow-up</small>
          </div>
        </div>

        <div className="payments-page-tabs" role="tablist" aria-label="Payments pages">
          {PAYMENT_PAGES.map((page) => (
            <button
              key={page.id}
              type="button"
              role="tab"
              aria-selected={activePage === page.id}
              className={`make-chip-btn payments-tab-btn${activePage === page.id ? ' active' : ''}`}
              onClick={() => setActivePage(page.id)}
            >
              <span className="payments-tab-label">{page.label}</span>
              <span className="payments-tab-hint">{page.hint}</span>
              <span className="payments-tab-count">{getPageCount(page.id)}</span>
            </button>
          ))}
        </div>

        <p className="hint payments-page-hint">{activePageHint}</p>
      </article>

      {activePage === 'setup' && (
        <PaymentsSetupPage
          permissions={permissions}
          loading={loading}
          portalConfig={portalConfig}
          setPortalConfig={setPortalConfig}
          onSavePortalConfig={handleSavePortalConfig}
          form={form}
          setForm={setForm}
          families={families}
          transactions={transactions}
          paymentGateways={paymentGateways}
          onCreateIntent={handleCreateIntent}
          latestInstructions={latestInstructions}
        />
      )}

      {activePage === 'proof' && (
        <PaymentsProofPage
          loading={loading}
          proofForm={proofForm}
          setProofForm={setProofForm}
          onSubmitProof={handleSubmitProof}
          pendingIntents={pendingIntents}
          pendingEventIntents={pendingEventIntents}
          pendingDonationIntents={pendingDonationIntents}
        />
      )}

      {activePage === 'verification' && (
        <PaymentsVerificationPage
          eventRegistrationIntents={eventRegistrationIntents}
          donationIntents={donationIntents}
          familyLookup={familyLookup}
          loading={loading}
          permissions={permissions}
          onReconcile={reconcileIntent}
          onResendReceipt={resendReceipt}
        />
      )}
    </section>
  )
}
