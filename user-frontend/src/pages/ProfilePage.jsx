import { Link } from 'react-router-dom'
import { formatCurrency } from '../api'
import { usePortal } from '../context/usePortal'

export function ProfilePage() {
  const { userData } = usePortal()

  if (!userData) {
    return (
      <section className="panel ring-1 ring-amber-100/60">
        <p>Loading profile...</p>
      </section>
    )
  }

  const summary = userData.summary || {}

  return (
    <section className="profile-stack pb-2">
      <article className="panel ring-1 ring-amber-100/60">
        <div className="panel-head split gap-3">
          <div>
            <h2>My Profile</h2>
            <p>{summary?.family?.familyId} - {summary?.family?.headName}</p>
          </div>
          <div className="chip-row items-center">
            <span className="chip">Active Mandir: {userData.account?.activeMandirId || '-'}</span>
          </div>
        </div>

        <div className="stats-grid user-stats items-stretch">
          <article className="backdrop-blur-sm">
            <span>Lifetime Contributions</span>
            <strong>{formatCurrency(summary?.stats?.lifetimeContributions || 0)}</strong>
          </article>
          <article className="backdrop-blur-sm">
            <span>Pending Pledges</span>
            <strong>{formatCurrency(summary?.stats?.pendingAmount || 0)}</strong>
          </article>
          <article className="backdrop-blur-sm">
            <span>Receipt Count</span>
            <strong>{summary?.stats?.receiptCount || 0}</strong>
          </article>
        </div>
      </article>

      <section className="content-grid items-start">
        <article className="panel ring-1 ring-amber-100/60">
          <h3>Quick Actions</h3>
          <p>Donation aur pooja booking ke liye alag pages use karein.</p>
          <div className="chip-row">
            <Link className="inline-link" to="/donation">Open Donation Page</Link>
            <Link className="inline-link" to="/pooja-schedule">Open Pooja Schedule</Link>
          </div>
        </article>

        <article className="panel ring-1 ring-amber-100/60">
          <h3>Family Details</h3>
          <p><strong>Family ID:</strong> {summary?.family?.familyId || '-'}</p>
          <p><strong>Head Name:</strong> {summary?.family?.headName || '-'}</p>
          <p><strong>Gotra:</strong> {summary?.family?.gotra || '-'}</p>
          <p><strong>WhatsApp:</strong> {summary?.family?.whatsapp || userData.account?.whatsapp || '-'}</p>
          <p><strong>Email:</strong> {userData.account?.email || '-'}</p>
        </article>
      </section>
    </section>
  )
}
