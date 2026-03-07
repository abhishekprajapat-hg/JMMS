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
}) {
  return (
    <section className="panel-grid two-column">
      <article className="panel">
        <div className="panel-head">
          <h2>Finance & Donation Engine</h2>
          <p>Bhent, Boli, and Gupt Daan with fund category and payment status logic.</p>
        </div>

        {permissions.logDonations && (
          <form className="stack-form" onSubmit={handleTransactionSubmit}>
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
              Due Date (required for Pledged)
              <input
                type="date"
                value={transactionForm.dueDate}
                disabled={transactionForm.status !== 'Pledged'}
                onChange={(event) => setTransactionForm((current) => ({ ...current, dueDate: event.target.value }))}
              />
            </label>
            <button type="submit" disabled={working}>Log Transaction</button>
          </form>
        )}
      </article>

      <article className="panel">
        <div className="panel-head">
          <h2>Transactions</h2>
          <p>Receipt is generated when status is Paid. Deletion is blocked post receipt.</p>
        </div>
        <label className="filter-control">
          Search Transactions
          <input
            value={transactionSearch}
            onChange={(event) => setTransactionSearch(event.target.value)}
            placeholder="Search by ID, family, type, fund, status, amount"
          />
        </label>
        <div className="action-row">
          <button type="button" className="secondary-btn" onClick={handleExportTransactionsCsv}>
            Export Transactions CSV
          </button>
        </div>
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan="9">
                    {transactions.length === 0
                      ? 'No transactions recorded yet.'
                      : 'No transactions match this search.'}
                  </td>
                </tr>
              )}
              {filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className={transaction.cancelled ? 'row-muted' : ''}>
                  <td>{transaction.id}</td>
                  <td>
                    {transaction.type === 'Gupt Daan'
                      ? 'Anonymous'
                      : familyLookup[transaction.familyId]?.headName || '-'}
                  </td>
                  <td>{transaction.type}</td>
                  <td>{transaction.fundCategory}</td>
                  <td>{transaction.cancelled ? `${transaction.status} (Cancelled)` : transaction.status}</td>
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
                    <div className="action-row">
                      {transaction.status === 'Pledged' && permissions.logDonations && (
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() => handleMarkPledgeAsPaid(transaction.id)}
                          disabled={working}
                        >
                          Mark Paid
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {canCancelOrRefund && (
          <form className="stack-form" onSubmit={handleRefundSubmit}>
            <h3>Formal Cancellation / Refund Log</h3>
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
          <div className="table-wrap compact">
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
          <div className="table-wrap compact">
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
      </article>
    </section>
  )
}
