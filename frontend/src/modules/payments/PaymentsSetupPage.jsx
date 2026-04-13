import { formatCurrency } from '../../utils/validation'

export function PaymentsSetupPage({
  permissions,
  loading,
  portalConfig,
  setPortalConfig,
  onSavePortalConfig,
  form,
  setForm,
  families,
  transactions,
  paymentGateways,
  onCreateIntent,
  latestInstructions,
}) {
  return (
    <article className="panel payments-page-card">
      <div className="panel-head">
        <h2>Setup & Intent Creation</h2>
        <p>Configure payee details and generate direct payment intents.</p>
      </div>

      <div className="payments-setup-grid">
        {permissions.managePayments && (
          <section className="payments-surface-card">
            <form className="stack-form" onSubmit={onSavePortalConfig}>
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
          </section>
        )}

        <section className="payments-surface-card">
          {permissions.managePayments ? (
            <form className="stack-form" onSubmit={onCreateIntent}>
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
        </section>
      </div>

      {latestInstructions && (
        <div className="stack-form payments-surface-card payments-instructions-card">
          <h3>Latest Payment Instructions ({latestInstructions.paymentId})</h3>
          <p className="hint">Preferred: {latestInstructions.preferredGateway || '-'}</p>
          {latestInstructions.upiLink ? (
            <div className="payments-instruction-block">
              <p className="hint">UPI Link: {latestInstructions.upiLink}</p>
              <a href={latestInstructions.upiLink}>Pay via UPI App</a>
              {latestInstructions.upiQrDataUrl && (
                <img src={latestInstructions.upiQrDataUrl} alt="UPI QR" className="qr-preview" />
              )}
            </div>
          ) : (
            <p className="hint">UPI is not configured for this mandir.</p>
          )}
          {latestInstructions.bankTransfer ? (
            <div className="payments-instructions-grid">
              <p className="hint">Bank: {latestInstructions.bankTransfer.bankName || '-'}</p>
              <p className="hint">A/C: {latestInstructions.bankTransfer.accountNumber || '-'}</p>
              <p className="hint">IFSC: {latestInstructions.bankTransfer.ifsc || '-'}</p>
              <p className="hint">Payee: {latestInstructions.bankTransfer.payeeName || '-'}</p>
            </div>
          ) : (
            <p className="hint">Bank transfer details are not configured for this mandir.</p>
          )}
        </div>
      )}
    </article>
  )
}
