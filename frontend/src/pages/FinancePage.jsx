import { useMemo, useState } from 'react'
import {
  CollapsiblePanelHead,
  PanelCollapseActions,
  usePanelSections,
} from '../components/PanelCollapseControls'

const FINANCE_SECTION_KEYS = {
  donationEngine: 'donationEngine',
  transactions: 'transactions',
}

const FINANCE_ALL_SECTION_KEYS = [FINANCE_SECTION_KEYS.donationEngine, FINANCE_SECTION_KEYS.transactions]

function getTransactionStatusLabel(transaction) {
  if (!transaction) return '-'
  if (transaction.cancelled) return `${transaction.status} (Cancelled)`
  return transaction.status || '-'
}

function getTransactionStatusClass(transaction) {
  if (!transaction) return 'is-default'
  if (transaction.cancelled) return 'is-cancelled'
  const normalized = String(transaction.status || '').toLowerCase()
  if (normalized === 'paid') return 'is-paid'
  if (normalized === 'pledged') return 'is-pledged'
  return 'is-default'
}

export function FinancePage({
  permissions,
  handleTransactionSubmit,
  transactionForm,
  setTransactionForm,
  transactionTypes,
  families,
  fundCategories,
  paymentStatuses,
  working,
  transactionSearch,
  setTransactionSearch,
  handleExportTransactionsCsv,
  filteredTransactions,
  transactions,
  familyLookup,
  formatCurrency,
  formatDate,
  handleMarkPledgeAsPaid,
  canCancelOrRefund,
  handleRefundSubmit,
  refundForm,
  setRefundForm,
  paidTransactions,
  cancellationLogs,
  approvalQueue,
  handleApprovalDecision,
  selectedTransactionId,
  onOpenTransaction,
}) {
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [fundFilter, setFundFilter] = useState('all')

  const selectedTransaction = selectedTransactionId
    ? transactions.find((transaction) => transaction.id === selectedTransactionId) || null
    : null

  const {
    collapsedSections,
    areAllVisibleSectionsCollapsed,
    areAllVisibleSectionsExpanded,
    toggleSection,
    setAllVisibleSections,
  } = usePanelSections(FINANCE_ALL_SECTION_KEYS)

  const visibleTransactions = useMemo(
    () =>
      filteredTransactions.filter((transaction) => {
        if (statusFilter !== 'all' && String(transaction.status || '') !== statusFilter) return false
        if (typeFilter !== 'all' && String(transaction.type || '') !== typeFilter) return false
        if (fundFilter !== 'all' && String(transaction.fundCategory || '') !== fundFilter) return false
        return true
      }),
    [filteredTransactions, statusFilter, typeFilter, fundFilter],
  )

  const collectedAmount = useMemo(
    () =>
      transactions
        .filter((transaction) => transaction.status === 'Paid' && !transaction.cancelled)
        .reduce((sum, transaction) => sum + (Number(transaction.amount) || 0), 0),
    [transactions],
  )

  const pendingAmount = useMemo(
    () =>
      transactions
        .filter((transaction) => transaction.status === 'Pledged' && !transaction.cancelled)
        .reduce((sum, transaction) => sum + (Number(transaction.amount) || 0), 0),
    [transactions],
  )

  const paidCount = useMemo(
    () => transactions.filter((transaction) => transaction.status === 'Paid' && !transaction.cancelled).length,
    [transactions],
  )
  const pledgedCount = useMemo(
    () => transactions.filter((transaction) => transaction.status === 'Pledged' && !transaction.cancelled).length,
    [transactions],
  )
  const cancelledCount = useMemo(
    () => transactions.filter((transaction) => transaction.cancelled).length,
    [transactions],
  )

  const hasActiveFilters =
    transactionSearch.trim() || statusFilter !== 'all' || typeFilter !== 'all' || fundFilter !== 'all'

  function clearFilters() {
    setTransactionSearch('')
    setStatusFilter('all')
    setTypeFilter('all')
    setFundFilter('all')
  }

  return (
    <section
      className={
        selectedTransactionId
          ? 'panel-grid two-column finance-page finance-page-with-detail'
          : 'panel-grid two-column finance-page'
      }
    >
      <PanelCollapseActions
        areAllVisibleSectionsCollapsed={areAllVisibleSectionsCollapsed}
        areAllVisibleSectionsExpanded={areAllVisibleSectionsExpanded}
        setAllVisibleSections={setAllVisibleSections}
      />

      <article className="panel finance-shell">
        <div className="panel-head">
          <h2>Donation Command Center</h2>
          <p>Manage entries, pledges, cancellations, approvals, and full transaction details in one flow.</p>
        </div>

        <div className="finance-overview-grid">
          <div className="finance-overview-card is-success">
            <span>Collected</span>
            <strong>{formatCurrency(collectedAmount)}</strong>
            <small>{paidCount} paid transactions</small>
          </div>
          <div className="finance-overview-card is-warning">
            <span>Pending Pledges</span>
            <strong>{formatCurrency(pendingAmount)}</strong>
            <small>{pledgedCount} pending transactions</small>
          </div>
          <div className="finance-overview-card">
            <span>Total Entries</span>
            <strong>{transactions.length}</strong>
            <small>all transactions</small>
          </div>
          <div className="finance-overview-card is-muted">
            <span>Cancelled</span>
            <strong>{cancelledCount}</strong>
            <small>cancelled / refunded logs</small>
          </div>
        </div>

        <div className="finance-toolbar">
          <label className="finance-toolbar-field">
            Search
            <input
              value={transactionSearch}
              onChange={(event) => setTransactionSearch(event.target.value)}
              placeholder="ID, family, type, fund, status, amount"
            />
          </label>

          <label className="finance-toolbar-field">
            Status
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All statuses</option>
              {paymentStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label className="finance-toolbar-field">
            Transaction Type
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              <option value="all">All types</option>
              {transactionTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label className="finance-toolbar-field">
            Fund
            <select value={fundFilter} onChange={(event) => setFundFilter(event.target.value)}>
              <option value="all">All funds</option>
              {fundCategories.map((fund) => (
                <option key={fund} value={fund}>
                  {fund}
                </option>
              ))}
            </select>
          </label>

          <div className="finance-toolbar-actions">
            <span className="hint">Showing {visibleTransactions.length} transactions</span>
            <button type="button" className="secondary-btn" onClick={handleExportTransactionsCsv}>
              Export CSV
            </button>
            {hasActiveFilters && (
              <button type="button" className="secondary-btn" onClick={clearFilters}>
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </article>

      {selectedTransactionId && (
        <article className="panel finance-detail-card">
          <div className="finance-detail-head">
            <h2>Transaction Details</h2>
            <div className="finance-detail-meta">
              <span className="finance-text-mono">{selectedTransaction ? selectedTransaction.id : selectedTransactionId}</span>
              {selectedTransaction ? (
                <span className={`finance-status-pill ${getTransactionStatusClass(selectedTransaction)}`}>
                  {getTransactionStatusLabel(selectedTransaction)}
                </span>
              ) : null}
            </div>
          </div>

          {selectedTransaction ? (
            <div className="stack-form">
              <div className="finance-detail-stats">
                <div>
                  <span>Amount</span>
                  <strong>{formatCurrency(selectedTransaction.amount)}</strong>
                </div>
                <div>
                  <span>Type</span>
                  <strong>{selectedTransaction.type || '-'}</strong>
                </div>
                <div>
                  <span>Fund</span>
                  <strong>{selectedTransaction.fundCategory || '-'}</strong>
                </div>
                <div>
                  <span>Family</span>
                  <strong>
                    {selectedTransaction.type === 'Gupt Daan'
                      ? 'Anonymous'
                      : familyLookup[selectedTransaction.familyId]?.headName || selectedTransaction.familyId || '-'}
                  </strong>
                </div>
              </div>

              <div className="table-wrap compact">
                <table>
                  <tbody>
                    <tr>
                      <th>Transaction ID</th>
                      <td className="finance-text-mono">{selectedTransaction.id}</td>
                    </tr>
                    <tr>
                      <th>Status</th>
                      <td>{getTransactionStatusLabel(selectedTransaction)}</td>
                    </tr>
                    <tr>
                      <th>Due Date</th>
                      <td>{formatDate(selectedTransaction.dueDate)}</td>
                    </tr>
                    <tr>
                      <th>Created At</th>
                      <td>{formatDate(selectedTransaction.createdAt)}</td>
                    </tr>
                    <tr>
                      <th>Receipt</th>
                      <td>
                        {selectedTransaction.receiptUrl ? (
                          <a href={selectedTransaction.receiptUrl} target="_blank" rel="noreferrer">
                            View Receipt
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="action-row">
                <button type="button" className="secondary-btn" onClick={() => onOpenTransaction('')}>
                  Back to Transactions
                </button>
                {selectedTransaction.status === 'Pledged' && permissions.logDonations && (
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => handleMarkPledgeAsPaid(selectedTransaction.id)}
                    disabled={working}
                  >
                    Mark Paid
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="stack-form">
              <p className="hint">No transaction found for this ID.</p>
              <div className="action-row">
                <button type="button" className="secondary-btn" onClick={() => onOpenTransaction('')}>
                  Back to Transactions
                </button>
              </div>
            </div>
          )}
        </article>
      )}

      <article className="panel finance-form-card">
        <CollapsiblePanelHead
          sectionKey={FINANCE_SECTION_KEYS.donationEngine}
          collapsedSections={collapsedSections}
          toggleSection={toggleSection}
          controlsId="finance-donation-engine-panel"
          title="New Donation Entry"
          subtitle="Create Bhent, Boli, or Gupt Daan with status-based flow."
        />
        <div id="finance-donation-engine-panel" hidden={collapsedSections[FINANCE_SECTION_KEYS.donationEngine]}>
          {permissions.logDonations ? (
            <form className="stack-form finance-entry-form" onSubmit={handleTransactionSubmit}>
              <div className="finance-entry-grid">
                <label>
                  Transaction Type
                  <select
                    value={transactionForm.type}
                    onChange={(event) =>
                      setTransactionForm((current) => ({
                        ...current,
                        type: event.target.value,
                        status: event.target.value === 'Gupt Daan' ? 'Paid' : current.status,
                      }))
                    }
                  >
                    {transactionTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Family Profile
                  <select
                    value={transactionForm.familyId}
                    onChange={(event) => setTransactionForm((current) => ({ ...current, familyId: event.target.value }))}
                    disabled={transactionForm.type === 'Gupt Daan'}
                  >
                    {families.map((family) => (
                      <option key={family.familyId} value={family.familyId}>
                        {family.familyId} - {family.headName}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Fund Category
                  <select
                    value={transactionForm.fundCategory}
                    onChange={(event) =>
                      setTransactionForm((current) => ({ ...current, fundCategory: event.target.value }))
                    }
                  >
                    {fundCategories.map((fund) => (
                      <option key={fund} value={fund}>
                        {fund}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Payment Status
                  <select
                    value={transactionForm.status}
                    onChange={(event) => setTransactionForm((current) => ({ ...current, status: event.target.value }))}
                    disabled={transactionForm.type === 'Gupt Daan'}
                  >
                    {paymentStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Amount (INR)
                  <input
                    type="number"
                    min="1"
                    value={transactionForm.amount}
                    onChange={(event) => setTransactionForm((current) => ({ ...current, amount: event.target.value }))}
                  />
                </label>

                <label>
                  Due Date (for Pledged)
                  <input
                    type="date"
                    value={transactionForm.dueDate}
                    disabled={transactionForm.status !== 'Pledged'}
                    onChange={(event) => setTransactionForm((current) => ({ ...current, dueDate: event.target.value }))}
                  />
                </label>
              </div>
              <button type="submit" disabled={working}>Log Transaction</button>
            </form>
          ) : (
            <p className="hint">Your role can view transactions only.</p>
          )}
        </div>
      </article>

      <article className="panel finance-transactions-card">
        <CollapsiblePanelHead
          sectionKey={FINANCE_SECTION_KEYS.transactions}
          collapsedSections={collapsedSections}
          toggleSection={toggleSection}
          controlsId="finance-transactions-panel"
          title="Transactions Ledger"
          subtitle="Open any transaction row to view complete details."
        />
        <div id="finance-transactions-panel" hidden={collapsedSections[FINANCE_SECTION_KEYS.transactions]}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Family</th>
                  <th>Type</th>
                  <th>Fund</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th>Due Date</th>
                  <th>Receipt</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleTransactions.length === 0 && (
                  <tr>
                    <td colSpan="9">
                      {transactions.length === 0
                        ? 'No transactions recorded yet.'
                        : filteredTransactions.length === 0
                          ? 'No transactions match this search.'
                          : 'No transactions match selected filters.'}
                    </td>
                  </tr>
                )}
                {visibleTransactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className={`finance-transaction-row${transaction.cancelled ? ' row-muted' : ''}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`Open transaction ${transaction.id}`}
                    onClick={() => onOpenTransaction(transaction.id)}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter' && event.key !== ' ') return
                      event.preventDefault()
                      onOpenTransaction(transaction.id)
                    }}
                  >
                    <td className="finance-text-mono">{transaction.id}</td>
                    <td>
                      {transaction.type === 'Gupt Daan'
                        ? 'Anonymous'
                        : familyLookup[transaction.familyId]?.headName || '-'}
                    </td>
                    <td>{transaction.type}</td>
                    <td>{transaction.fundCategory}</td>
                    <td>
                      <span className={`finance-status-pill ${getTransactionStatusClass(transaction)}`}>
                        {getTransactionStatusLabel(transaction)}
                      </span>
                    </td>
                    <td>{formatCurrency(transaction.amount)}</td>
                    <td>{formatDate(transaction.dueDate)}</td>
                    <td>
                      {transaction.receiptUrl ? (
                        <a href={transaction.receiptUrl} target="_blank" rel="noreferrer">
                          View
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>
                      {transaction.status === 'Pledged' && permissions.logDonations ? (
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={(event) => {
                            event.stopPropagation()
                            handleMarkPledgeAsPaid(transaction.id)
                          }}
                          disabled={working}
                        >
                          Mark Paid
                        </button>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {canCancelOrRefund && (
            <form className="stack-form finance-subsection" onSubmit={handleRefundSubmit}>
              <h3>Cancellation / Refund Log</h3>
              <label>
                Transaction
                <select
                  value={refundForm.transactionId}
                  onChange={(event) =>
                    setRefundForm((current) => ({ ...current, transactionId: event.target.value }))
                  }
                >
                  <option value="">Select receipted transaction</option>
                  {paidTransactions.map((transaction) => (
                    <option key={transaction.id} value={transaction.id}>
                      {transaction.id} - {formatCurrency(transaction.amount)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Reason
                <textarea
                  value={refundForm.reason}
                  onChange={(event) => setRefundForm((current) => ({ ...current, reason: event.target.value }))}
                />
              </label>
              <button type="submit" disabled={working}>Create Cancellation Log</button>
            </form>
          )}

          {canCancelOrRefund && (
            <div className="table-wrap compact finance-subsection">
              <table>
                <thead>
                  <tr>
                    <th>Log ID</th>
                    <th>Transaction</th>
                    <th>Family</th>
                    <th>Amount</th>
                    <th>Reason</th>
                    <th>Action By</th>
                  </tr>
                </thead>
                <tbody>
                  {cancellationLogs.length === 0 && (
                    <tr>
                      <td colSpan="6">No cancellation/refund logs recorded.</td>
                    </tr>
                  )}
                  {cancellationLogs.map((log) => (
                    <tr key={log.id}>
                      <td>{log.id}</td>
                      <td>{log.transactionId}</td>
                      <td>{log.familyName}</td>
                      <td>{formatCurrency(log.amount)}</td>
                      <td>{log.reason}</td>
                      <td>{log.actionBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {permissions.approveSensitiveActions && (
            <div className="table-wrap compact finance-subsection">
              <table>
                <thead>
                  <tr>
                    <th>Approval ID</th>
                    <th>Type</th>
                    <th>Requested By</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {approvalQueue.length === 0 && (
                    <tr>
                      <td colSpan="5">No approval requests.</td>
                    </tr>
                  )}
                  {approvalQueue.map((approval) => (
                    <tr key={approval.id}>
                      <td>{approval.id}</td>
                      <td>{approval.type}</td>
                      <td>{approval.requestedByName || approval.requestedBy}</td>
                      <td>{approval.status}</td>
                      <td>
                        {approval.status === 'Pending' ? (
                          <div className="action-row">
                            <button
                              type="button"
                              className="secondary-btn"
                              onClick={() => handleApprovalDecision(approval.id, 'approve')}
                              disabled={working}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="secondary-btn"
                              onClick={() => handleApprovalDecision(approval.id, 'reject')}
                              disabled={working}
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
          )}
        </div>
      </article>
    </section>
  )
}
