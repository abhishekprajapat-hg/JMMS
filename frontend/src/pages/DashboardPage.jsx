import { useMemo, useState } from 'react'

const DASHBOARD_SECTION_KEYS = {
  overdue: 'overdue',
  metrics: 'metrics',
  recentDonations: 'recentDonations',
  upcomingPooja: 'upcomingPooja',
  analytics: 'analytics',
}

const DASHBOARD_SECTION_CONTENT_IDS = {
  overdue: 'dashboard-overdue-section',
  metrics: 'dashboard-metrics-section',
  recentDonations: 'dashboard-recent-donations-section',
  upcomingPooja: 'dashboard-upcoming-pooja-section',
  analytics: 'dashboard-analytics-section',
}

const INITIAL_COLLAPSED_SECTIONS = {
  [DASHBOARD_SECTION_KEYS.overdue]: false,
  [DASHBOARD_SECTION_KEYS.metrics]: false,
  [DASHBOARD_SECTION_KEYS.recentDonations]: false,
  [DASHBOARD_SECTION_KEYS.upcomingPooja]: false,
  [DASHBOARD_SECTION_KEYS.analytics]: false,
}

function SectionToggleButton({ sectionKey, collapsedSections, onToggleSection, controlsId }) {
  const isCollapsed = collapsedSections[sectionKey]
  return (
    <button
      type="button"
      className="make-chip-btn dashboard-toggle-btn"
      onClick={() => onToggleSection(sectionKey)}
      aria-expanded={!isCollapsed}
      aria-controls={controlsId}
    >
      {isCollapsed ? 'Expand' : 'Collapse'}
    </button>
  )
}

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
  const [collapsedSections, setCollapsedSections] = useState(INITIAL_COLLAPSED_SECTIONS)

  const overdueAssetsCount = localMetrics.overdueAssets.length

  const visibleSectionKeys = useMemo(() => {
    const keys = [
      DASHBOARD_SECTION_KEYS.metrics,
      DASHBOARD_SECTION_KEYS.recentDonations,
      DASHBOARD_SECTION_KEYS.upcomingPooja,
    ]
    if (overdueAssetsCount > 0) keys.unshift(DASHBOARD_SECTION_KEYS.overdue)
    if (canViewReports) keys.push(DASHBOARD_SECTION_KEYS.analytics)
    return keys
  }, [overdueAssetsCount, canViewReports])

  const areAllVisibleSectionsCollapsed = visibleSectionKeys.every((key) => collapsedSections[key])
  const areAllVisibleSectionsExpanded = visibleSectionKeys.every((key) => !collapsedSections[key])

  function toggleSection(sectionKey) {
    setCollapsedSections((current) => ({
      ...current,
      [sectionKey]: !current[sectionKey],
    }))
  }

  function setAllVisibleSections(isCollapsed) {
    setCollapsedSections((current) => {
      const next = { ...current }
      visibleSectionKeys.forEach((key) => {
        next[key] = isCollapsed
      })
      return next
    })
  }

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
        <div className="make-dashboard-head-row">
          <div>
            <h1>Jai Jinendra, {currentUser.fullName}</h1>
            <p>{roleDashboardSubtitle}</p>
          </div>
          <div className="dashboard-bulk-actions">
            <button
              type="button"
              className="make-chip-btn dashboard-bulk-action-btn"
              onClick={() => setAllVisibleSections(true)}
              disabled={areAllVisibleSectionsCollapsed}
            >
              Collapse all
            </button>
            <button
              type="button"
              className="make-chip-btn dashboard-bulk-action-btn"
              onClick={() => setAllVisibleSections(false)}
              disabled={areAllVisibleSectionsExpanded}
            >
              Expand all
            </button>
          </div>
        </div>
      </header>

      {overdueAssetsCount > 0 && (
        <article className="make-overdue-alert">
          <div
            className={
              collapsedSections[DASHBOARD_SECTION_KEYS.overdue]
                ? 'dashboard-section-head dashboard-section-head-alert collapsed'
                : 'dashboard-section-head dashboard-section-head-alert'
            }
          >
            <div>
              <h3>&#9888; Overdue Assets</h3>
              <p>{overdueAssetsCount} asset(s) pending return</p>
            </div>
            <SectionToggleButton
              sectionKey={DASHBOARD_SECTION_KEYS.overdue}
              collapsedSections={collapsedSections}
              onToggleSection={toggleSection}
              controlsId={DASHBOARD_SECTION_CONTENT_IDS.overdue}
            />
          </div>
          <div
            id={DASHBOARD_SECTION_CONTENT_IDS.overdue}
            hidden={collapsedSections[DASHBOARD_SECTION_KEYS.overdue]}
          >
            <p>{overdueAssetsCount} asset(s) are overdue for return. Please check the Bhandar.</p>
          </div>
        </article>
      )}

      <article className="make-dashboard-card dashboard-section-card">
        <div
          className={
            collapsedSections[DASHBOARD_SECTION_KEYS.metrics]
              ? 'dashboard-section-head collapsed'
              : 'dashboard-section-head'
          }
        >
          <div>
            <h2>Overview Metrics</h2>
            <p>Quick view of your core mandir numbers</p>
          </div>
          <SectionToggleButton
            sectionKey={DASHBOARD_SECTION_KEYS.metrics}
            collapsedSections={collapsedSections}
            onToggleSection={toggleSection}
            controlsId={DASHBOARD_SECTION_CONTENT_IDS.metrics}
          />
        </div>
        <div
          id={DASHBOARD_SECTION_CONTENT_IDS.metrics}
          hidden={collapsedSections[DASHBOARD_SECTION_KEYS.metrics]}
        >
          <div className="make-metrics-grid">
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
          </div>
        </div>
      </article>

      <section className="make-dashboard-panels">
        <article className="make-dashboard-card">
          <div
            className={
              collapsedSections[DASHBOARD_SECTION_KEYS.recentDonations]
                ? 'panel-head dashboard-panel-head collapsed'
                : 'panel-head dashboard-panel-head'
            }
          >
            <div>
              <h2>Recent Donations</h2>
              <p>Latest {recentDonations.length} transactions</p>
            </div>
            <SectionToggleButton
              sectionKey={DASHBOARD_SECTION_KEYS.recentDonations}
              collapsedSections={collapsedSections}
              onToggleSection={toggleSection}
              controlsId={DASHBOARD_SECTION_CONTENT_IDS.recentDonations}
            />
          </div>
          <div
            id={DASHBOARD_SECTION_CONTENT_IDS.recentDonations}
            hidden={collapsedSections[DASHBOARD_SECTION_KEYS.recentDonations]}
          >
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
          </div>
        </article>

        <article className="make-dashboard-card">
          <div
            className={
              collapsedSections[DASHBOARD_SECTION_KEYS.upcomingPooja]
                ? 'panel-head dashboard-panel-head collapsed'
                : 'panel-head dashboard-panel-head'
            }
          >
            <div>
              <h2>Upcoming Pooja Schedule</h2>
              <p>Next {upcomingPooja.length || 5} scheduled events</p>
            </div>
            <SectionToggleButton
              sectionKey={DASHBOARD_SECTION_KEYS.upcomingPooja}
              collapsedSections={collapsedSections}
              onToggleSection={toggleSection}
              controlsId={DASHBOARD_SECTION_CONTENT_IDS.upcomingPooja}
            />
          </div>
          <div
            id={DASHBOARD_SECTION_CONTENT_IDS.upcomingPooja}
            hidden={collapsedSections[DASHBOARD_SECTION_KEYS.upcomingPooja]}
          >
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
          </div>
        </article>

        {canViewReports && (
          <article className="make-dashboard-card">
            <div
              className={
                collapsedSections[DASHBOARD_SECTION_KEYS.analytics]
                  ? 'panel-head dashboard-panel-head collapsed'
                  : 'panel-head dashboard-panel-head'
              }
            >
              <div>
                <h2>Analytics Snapshot</h2>
                <p>{analyticsReport.reportDate ? `Updated ${formatDate(analyticsReport.reportDate)}` : 'No report yet'}</p>
              </div>
              <SectionToggleButton
                sectionKey={DASHBOARD_SECTION_KEYS.analytics}
                collapsedSections={collapsedSections}
                onToggleSection={toggleSection}
                controlsId={DASHBOARD_SECTION_CONTENT_IDS.analytics}
              />
            </div>
            <div id={DASHBOARD_SECTION_CONTENT_IDS.analytics} hidden={collapsedSections[DASHBOARD_SECTION_KEYS.analytics]}>
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
            </div>
          </article>
        )}
      </section>
    </section>
  )
}
