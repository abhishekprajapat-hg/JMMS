import { PaymentIntentTable } from './PaymentIntentTable'

export function PaymentsVerificationPage({
  eventRegistrationIntents,
  donationIntents,
  familyLookup,
  loading,
  permissions,
  onReconcile,
  onResendReceipt,
  onOpenIntent,
}) {
  const eventPendingCount = eventRegistrationIntents.filter((intent) =>
    ['Pending', 'Proof Submitted'].includes(intent.status),
  ).length
  const donationPendingCount = donationIntents.filter((intent) =>
    ['Pending', 'Proof Submitted'].includes(intent.status),
  ).length
  const eventSuccessCount = eventRegistrationIntents.filter((intent) => intent.status === 'Success').length
  const donationSuccessCount = donationIntents.filter((intent) => intent.status === 'Success').length

  return (
    <article className="panel payments-page-card">
      <div className="panel-head">
        <h2>Verification Console</h2>
        <p>Verify, reject, settle, and resend receipts from separated payment queues.</p>
      </div>

      <div className="payments-verify-metrics">
        <div>
          <span>Event Queue</span>
          <strong>{eventRegistrationIntents.length}</strong>
          <small>{eventPendingCount} pending</small>
        </div>
        <div>
          <span>Donation Queue</span>
          <strong>{donationIntents.length}</strong>
          <small>{donationPendingCount} pending</small>
        </div>
        <div>
          <span>Event Success</span>
          <strong>{eventSuccessCount}</strong>
          <small>approved and settled</small>
        </div>
        <div>
          <span>Donation Success</span>
          <strong>{donationSuccessCount}</strong>
          <small>approved and settled</small>
        </div>
      </div>

      <div className="payments-table-section">
        <div className="stack-form">
          <h3>Event Registration Payments</h3>
          <p className="hint">Only payments linked to event registrations are listed here. Row click opens full details.</p>
        </div>
        <PaymentIntentTable
          items={eventRegistrationIntents}
          emptyLabel="No event registration payments yet."
          familyLookup={familyLookup}
          loading={loading}
          permissions={permissions}
          onReconcile={onReconcile}
          onResendReceipt={onResendReceipt}
          onOpenIntent={onOpenIntent}
        />
      </div>

      <div className="payments-table-section">
        <div className="stack-form">
          <h3>Donation & Other Payments</h3>
          <p className="hint">Donation intents and non-event linked payments are listed here. Row click opens full details.</p>
        </div>
        <PaymentIntentTable
          items={donationIntents}
          emptyLabel="No donation or other payments yet."
          familyLookup={familyLookup}
          loading={loading}
          permissions={permissions}
          onReconcile={onReconcile}
          onResendReceipt={onResendReceipt}
          onOpenIntent={onOpenIntent}
        />
      </div>
    </article>
  )
}
