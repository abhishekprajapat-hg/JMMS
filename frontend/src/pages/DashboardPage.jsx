export function DashboardPage({
  currentUser,
  roleDashboardSubtitle,
  localMetrics,
  families,
  formatDashboardAmount,
  todaysCollectionAmount,
  totalCollectionAmount,
  pendingPledgeAmount,
  recentDonations,
  upcomingPooja,
  familyLookup,
  canViewReports,
  analyticsReport,
  formatDate,
  formatCurrency,
}) {
  function getBookingDateLabel(booking) {
    const startDate = booking.startDate || booking.date
    const endDate = booking.endDate || booking.date || startDate
    if (!startDate && !endDate) return '-'
    if (startDate === endDate) return formatDate(startDate)
    return `${formatDate(startDate)} - ${formatDate(endDate)}`
  }

  return (
    <section className="make-dashboard-content">
      <header className="make-dashboard-head">
        <h1>Jai Jinendra, {currentUser.fullName}</h1>
        <p>{roleDashboardSubtitle}</p>
      </header>

      {localMetrics.overdueAssets.length > 0 && (
        <article className="make-overdue-alert">
          <h3>&#9888; Overdue Assets</h3>
          <p>
            {localMetrics.overdueAssets.length} asset(s) are overdue for return. Please check the Bhandar.
          </p>
        </article>
      )}

      <section className="make-metrics-grid">
        <article className="make-metric-box">
          <h3>Total Families</h3>
          <strong>{families.length}</strong>
          <p>Registered devotees</p>
        </article>
        <article className="make-metric-box">
          <h3>Today&apos;s Collection</h3>
          <strong>{formatDashboardAmount(todaysCollectionAmount)}</strong>
          <p>Received today</p>
        </article>
        <article className="make-metric-box">
          <h3>Total Collections</h3>
          <strong>{formatDashboardAmount(totalCollectionAmount)}</strong>
          <p>All-time donations</p>
        </article>
        <article className="make-metric-box">
          <h3>Pending Pledges</h3>
          <strong>{formatDashboardAmount(pendingPledgeAmount)}</strong>
          <p>Awaiting payment</p>
        </article>
      </section>

      <section className="make-dashboard-panels">
        <article className="make-dashboard-card">
          <div className="panel-head">
            <h2>Recent Donations</h2>
            <p>Latest {recentDonations.length} transactions</p>
          </div>
          {recentDonations.length === 0 ? (
            <p className="hint">No paid donations recorded yet.</p>
          ) : (
            <div className="make-donation-list">
              {recentDonations.map((transaction) => (
                <div key={transaction.id} className="make-donation-item">
                  <div>
                    <strong>
                      {transaction.type === 'Gupt Daan'
                        ? 'Anonymous'
                        : familyLookup[transaction.familyId]?.headName || transaction.familyId}
                    </strong>
                    <span>{formatDate(transaction.createdAt)}</span>
                  </div>
                  <div>
                    <strong>{formatDashboardAmount(transaction.amount)}</strong>
                    <span>paid</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="make-dashboard-card">
          <div className="panel-head">
            <h2>Upcoming Pooja Schedule</h2>
            <p>Next {upcomingPooja.length || 5} scheduled events</p>
          </div>
          {upcomingPooja.length === 0 ? (
            <p className="make-empty-state">No upcoming poojas scheduled</p>
          ) : (
            <div className="make-donation-list">
              {upcomingPooja.map((booking) => (
                <div key={booking.id} className="make-donation-item">
                  <div>
                    <strong>{booking.slot}</strong>
                    <span>{getBookingDateLabel(booking)}</span>
                  </div>
                  <div>
                    <strong>{familyLookup[booking.familyId]?.headName || booking.familyId}</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        {canViewReports && (
          <article className="make-dashboard-card">
            <div className="panel-head">
              <h2>Analytics Snapshot</h2>
              <p>{analyticsReport.reportDate ? `Updated ${formatDate(analyticsReport.reportDate)}` : 'No report yet'}</p>
            </div>
            <div className="table-wrap compact">
              <table>
                <thead>
                  <tr>
                    <th>Top Contributors</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {analyticsReport.topContributors.length === 0 && (
                    <tr>
                      <td colSpan="2">No contributor data yet.</td>
                    </tr>
                  )}
                  {analyticsReport.topContributors.slice(0, 5).map((row) => (
                    <tr key={row.familyId}>
                      <td>{row.familyName}</td>
                      <td>{formatCurrency(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="table-wrap compact">
              <table>
                <thead>
                  <tr>
                    <th>Pledge Aging</th>
                    <th>Amount</th>
                    <th>Count</th>
                  </tr>
                </thead>
                <tbody>
                  {analyticsReport.pledgeAging.length === 0 && (
                    <tr>
                      <td colSpan="3">No aging data yet.</td>
                    </tr>
                  )}
                  {analyticsReport.pledgeAging.map((row) => (
                    <tr key={row.key}>
                      <td>{row.label}</td>
                      <td>{formatCurrency(row.amount)}</td>
                      <td>{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        )}
      </section>
    </section>
  )
}
