import { formatCurrency } from '../../utils/validation'

function getStatusClass(status) {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'success') return 'is-success'
  if (normalized === 'failed') return 'is-failed'
  if (normalized === 'proof submitted') return 'is-proof'
  if (normalized === 'pending') return 'is-pending'
  return 'is-default'
}

export function PaymentIntentTable({
  items,
  emptyLabel,
  familyLookup,
  loading,
  permissions,
  onReconcile,
  onResendReceipt,
}) {
  return (
    <div className="table-wrap payments-intent-table">
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
          {items.length === 0 && (
            <tr>
              <td colSpan="8">{emptyLabel}</td>
            </tr>
          )}
          {items.map((intent) => (
            <tr key={intent.id}>
              <td className="payments-text-mono">{intent.id}</td>
              <td>{familyLookup[intent.familyId] || intent.familyId}</td>
              <td className="payments-text-strong">{formatCurrency(intent.amount)}</td>
              <td>
                <span className="payments-gateway-pill">{intent.gateway}</span>
              </td>
              <td>
                <span className={`payments-status-badge ${getStatusClass(intent.status)}`}>
                  {intent.status}
                </span>
              </td>
              <td className="payments-text-mono">{intent.payerUtr || '-'}</td>
              <td className="payments-text-mono">{intent.linkedTransactionId || '-'}</td>
              <td>
                {['Pending', 'Proof Submitted'].includes(intent.status) && permissions.reconcilePayments ? (
                  <div className="action-row payments-action-row">
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() => onReconcile(intent.id, 'success')}
                      disabled={loading}
                    >
                      Verify + Settle
                    </button>
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() => onReconcile(intent.id, 'failed')}
                      disabled={loading}
                    >
                      Reject
                    </button>
                  </div>
                ) : intent.status === 'Success' && permissions.reconcilePayments ? (
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => onResendReceipt(intent.id)}
                    disabled={loading}
                  >
                    Resend Receipt
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
  )
}
