import { formatCurrency } from '../../utils/validation'

export function PaymentsProofPage({
  loading,
  proofForm,
  setProofForm,
  onSubmitProof,
  pendingIntents,
  pendingEventIntents,
  pendingDonationIntents,
}) {
  const queuePreview = pendingIntents.slice(0, 5)

  return (
    <article className="panel payments-page-card">
      <div className="panel-head">
        <h2>Submit Payment Proof</h2>
        <p>Capture UTR details from devotee and move payment to verification queue.</p>
      </div>

      <div className="stats-inline payments-proof-stats">
        <div>
          <span>Total Pending</span>
          <strong>{pendingIntents.length}</strong>
        </div>
        <div>
          <span>Event Pending</span>
          <strong>{pendingEventIntents.length}</strong>
        </div>
        <div>
          <span>Donation Pending</span>
          <strong>{pendingDonationIntents.length}</strong>
        </div>
      </div>

      <div className="payments-proof-grid">
        <form className="stack-form payments-surface-card" onSubmit={onSubmitProof}>
          <h3>Submit UTR Proof</h3>
          <label>
            Payment Intent
            <select
              value={proofForm.paymentId}
              onChange={(event) => setProofForm((current) => ({ ...current, paymentId: event.target.value }))}
            >
              {pendingIntents.length === 0 && (
                <option value="">No pending payment intents</option>
              )}
              {pendingEventIntents.length > 0 && (
                <optgroup label="Event Registration Payments">
                  {pendingEventIntents.map((intent) => (
                    <option key={intent.id} value={intent.id}>
                      {intent.id} - {formatCurrency(intent.amount)}
                    </option>
                  ))}
                </optgroup>
              )}
              {pendingDonationIntents.length > 0 && (
                <optgroup label="Donation / Other Payments">
                  {pendingDonationIntents.map((intent) => (
                    <option key={intent.id} value={intent.id}>
                      {intent.id} - {formatCurrency(intent.amount)}
                    </option>
                  ))}
                </optgroup>
              )}
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

        <section className="payments-surface-card payments-proof-queue">
          <h3>Quick Queue Preview</h3>
          {queuePreview.length === 0 ? (
            <p className="hint">No pending proofs right now.</p>
          ) : (
            <ul className="payments-proof-list">
              {queuePreview.map((intent) => (
                <li key={intent.id}>
                  <span>{intent.id}</span>
                  <span>{formatCurrency(intent.amount)}</span>
                  <span>{intent.status}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </article>
  )
}
