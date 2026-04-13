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

function getIntentStatusClass(status) {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'success') return 'is-success'
  if (normalized === 'failed') return 'is-failed'
  if (normalized === 'proof submitted') return 'is-proof'
  if (normalized === 'pending') return 'is-pending'
  return 'is-default'
}

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
  selectedIntentId,
  onOpenIntent,
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
  const [intentQuery, setIntentQuery] = useState('')
  const [intentStatusFilter, setIntentStatusFilter] = useState('all')
  const [intentCategoryFilter, setIntentCategoryFilter] = useState('all')

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
  const selectedIntent = useMemo(
    () => (selectedIntentId ? enrichedIntents.find((intent) => intent.id === selectedIntentId) || null : null),
    [enrichedIntents, selectedIntentId],
  )
  const visibleIntents = useMemo(() => {
    const query = String(intentQuery || '').trim().toLowerCase()
    return enrichedIntents.filter((intent) => {
      if (intentCategoryFilter !== 'all' && intent.paymentCategory !== intentCategoryFilter) return false
      if (intentStatusFilter !== 'all' && String(intent.status || '') !== intentStatusFilter) return false
      if (!query) return true

      const familyLabel = familyLookup[intent.familyId] || ''
      const haystack = [
        intent.id,
        intent.familyId,
        familyLabel,
        intent.payerUtr,
        intent.linkedTransactionId,
        intent.gateway,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    })
  }, [enrichedIntents, intentCategoryFilter, intentStatusFilter, intentQuery, familyLookup])
  const visibleEventIntents = useMemo(
    () => visibleIntents.filter((intent) => intent.paymentCategory === 'event_registration'),
    [visibleIntents],
  )
  const visibleDonationIntents = useMemo(
    () => visibleIntents.filter((intent) => intent.paymentCategory !== 'event_registration'),
    [visibleIntents],
  )
  const visiblePendingIntents = useMemo(
    () => visibleIntents.filter((intent) => ['Pending', 'Proof Submitted'].includes(intent.status)),
    [visibleIntents],
  )
  const visiblePendingEventIntents = useMemo(
    () => visibleEventIntents.filter((intent) => ['Pending', 'Proof Submitted'].includes(intent.status)),
    [visibleEventIntents],
  )
  const visiblePendingDonationIntents = useMemo(
    () => visibleDonationIntents.filter((intent) => ['Pending', 'Proof Submitted'].includes(intent.status)),
    [visibleDonationIntents],
  )
  const visibleProofSubmittedCount = useMemo(
    () => visibleIntents.filter((intent) => intent.status === 'Proof Submitted').length,
    [visibleIntents],
  )
  const hasActiveIntentFilters = intentQuery.trim() || intentStatusFilter !== 'all' || intentCategoryFilter !== 'all'

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

  useEffect(() => {
    if (!selectedIntentId) return
    setActivePage('verification')
  }, [selectedIntentId])

  function formatDateTime(value) {
    if (!value) return '-'
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return '-'
    return parsed.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

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
    if (pageId === 'setup') return visibleIntents.length
    if (pageId === 'proof') return visiblePendingIntents.length
    if (pageId === 'verification') return visibleProofSubmittedCount
    return 0
  }

  const activePageHint =
    activePage === 'setup'
      ? 'Configure payee channels and create payment intents quickly.'
      : activePage === 'proof'
        ? 'Collect UTR evidence and push entries into reviewer queue.'
        : 'Review event and donation queues separately, then approve or reject.'

  function clearIntentFilters() {
    setIntentQuery('')
    setIntentStatusFilter('all')
    setIntentCategoryFilter('all')
  }

  return (
    <section
      className={
        selectedIntentId
          ? 'panel-grid payments-page-layout payments-page-layout-with-detail'
          : 'panel-grid payments-page-layout'
      }
    >
      <article className="panel payments-shell">
        <div className="payments-shell-head">
          <div className="panel-head">
            <h2>Payments Command Center</h2>
            <p>Focused workspace for setup, proof collection, and final verification.</p>
          </div>
          <div className="payments-shell-actions">
            <div className="payments-live-state">
              <span className={`payments-live-dot${loading ? ' is-loading' : ''}`} />
              <span>{loading ? 'Refreshing...' : 'Live status sync on'}</span>
            </div>
            <button type="button" className="secondary-btn" onClick={loadIntents} disabled={loading}>
              {loading ? 'Refreshing...' : 'Refresh Intents'}
            </button>
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

        <div className="payments-toolbar">
          <label className="payments-toolbar-field">
            Search Intent
            <input
              value={intentQuery}
              onChange={(event) => setIntentQuery(event.target.value)}
              placeholder="ID, UTR, family, linked transaction"
            />
          </label>
          <label className="payments-toolbar-field">
            Status
            <select
              value={intentStatusFilter}
              onChange={(event) => setIntentStatusFilter(event.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="Pending">Pending</option>
              <option value="Proof Submitted">Proof Submitted</option>
              <option value="Success">Success</option>
              <option value="Failed">Failed</option>
            </select>
          </label>
          <label className="payments-toolbar-field">
            Category
            <select
              value={intentCategoryFilter}
              onChange={(event) => setIntentCategoryFilter(event.target.value)}
            >
              <option value="all">All categories</option>
              <option value="donation">Donation / Other</option>
              <option value="event_registration">Event Registration</option>
            </select>
          </label>
          <div className="payments-toolbar-actions">
            <span className="hint">Showing {visibleIntents.length} intents</span>
            {hasActiveIntentFilters ? (
              <button type="button" className="secondary-btn" onClick={clearIntentFilters}>
                Clear Filters
              </button>
            ) : null}
          </div>
        </div>

        <p className="hint payments-page-hint">{activePageHint}</p>
      </article>

      {selectedIntentId && (
        <article className="panel payments-page-card payments-intent-detail-card">
          <div className="payments-intent-detail-head">
            <h2>Payment Intent Details</h2>
            <div className="payments-intent-detail-meta">
              <span className="payments-text-mono">{selectedIntent ? selectedIntent.id : selectedIntentId}</span>
              {selectedIntent ? (
                <span className={`payments-status-badge ${getIntentStatusClass(selectedIntent.status)}`}>
                  {selectedIntent.status}
                </span>
              ) : null}
            </div>
          </div>

          {selectedIntent ? (
            <div className="stack-form">
              <div className="payments-intent-detail-stats">
                <div>
                  <span>Status</span>
                  <strong>{selectedIntent.status || '-'}</strong>
                  <small>{selectedIntent.paymentCategory === 'event_registration' ? 'event registration' : 'donation'}</small>
                </div>
                <div>
                  <span>Amount</span>
                  <strong>{formatCurrency(selectedIntent.amount)}</strong>
                  <small>gateway: {selectedIntent.gateway || '-'}</small>
                </div>
                <div>
                  <span>Family</span>
                  <strong>{familyLookup[selectedIntent.familyId] || selectedIntent.familyId || '-'}</strong>
                  <small>linked txn: {selectedIntent.linkedTransactionId || '-'}</small>
                </div>
                <div>
                  <span>UTR</span>
                  <strong>{selectedIntent.payerUtr || '-'}</strong>
                  <small>provider ref: {selectedIntent.providerReference || '-'}</small>
                </div>
              </div>

              <div className="table-wrap compact">
                <table>
                  <tbody>
                    <tr>
                      <th>Payment ID</th>
                      <td className="payments-text-mono">{selectedIntent.id}</td>
                    </tr>
                    <tr>
                      <th>Source</th>
                      <td>{selectedIntent.source || '-'}</td>
                    </tr>
                    <tr>
                      <th>Note</th>
                      <td>{selectedIntent.note || '-'}</td>
                    </tr>
                    <tr>
                      <th>Payer Name</th>
                      <td>{selectedIntent.payerName || '-'}</td>
                    </tr>
                    <tr>
                      <th>Initiated</th>
                      <td>{formatDateTime(selectedIntent.initiatedAt)}</td>
                    </tr>
                    <tr>
                      <th>Proof Submitted</th>
                      <td>{formatDateTime(selectedIntent.proofSubmittedAt)}</td>
                    </tr>
                    <tr>
                      <th>Reconciled</th>
                      <td>{formatDateTime(selectedIntent.reconciledAt)}</td>
                    </tr>
                    <tr>
                      <th>Failure Reason</th>
                      <td>{selectedIntent.failureReason || '-'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="action-row">
                <button type="button" className="secondary-btn" onClick={() => onOpenIntent('')}>
                  Back to Payments
                </button>
                {['Pending', 'Proof Submitted'].includes(selectedIntent.status) && permissions.reconcilePayments ? (
                  <>
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() => reconcileIntent(selectedIntent.id, 'success')}
                      disabled={loading}
                    >
                      Verify + Settle
                    </button>
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() => reconcileIntent(selectedIntent.id, 'failed')}
                      disabled={loading}
                    >
                      Reject
                    </button>
                  </>
                ) : null}
                {selectedIntent.status === 'Success' && permissions.reconcilePayments ? (
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => resendReceipt(selectedIntent.id)}
                    disabled={loading}
                  >
                    Resend Receipt
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="stack-form">
              <p className="hint">{loading ? 'Loading payment intent...' : 'No payment intent found for this ID.'}</p>
              <div className="action-row">
                <button type="button" className="secondary-btn" onClick={() => onOpenIntent('')}>
                  Back to Payments
                </button>
              </div>
            </div>
          )}
        </article>
      )}

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
            pendingIntents={visiblePendingIntents}
            pendingEventIntents={visiblePendingEventIntents}
            pendingDonationIntents={visiblePendingDonationIntents}
            onOpenIntent={onOpenIntent}
          />
      )}

      {activePage === 'verification' && (
        <PaymentsVerificationPage
          eventRegistrationIntents={visibleEventIntents}
          donationIntents={visibleDonationIntents}
          familyLookup={familyLookup}
          loading={loading}
          permissions={permissions}
          onReconcile={reconcileIntent}
          onResendReceipt={resendReceipt}
          onOpenIntent={onOpenIntent}
        />
      )}
    </section>
  )
}
