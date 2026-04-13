import { useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../services/api'
import { formatCurrency, formatDate, toISODate } from '../utils/validation'
import {
  CollapsiblePanelHead,
  PanelCollapseActions,
  usePanelSections,
} from '../components/PanelCollapseControls'

const ACCOUNTING_SECTION_KEYS = {
  accountingLayer: 'accountingLayer',
  ledgerTrialBalance: 'ledgerTrialBalance',
}

const ACCOUNTING_ALL_SECTION_KEYS = [
  ACCOUNTING_SECTION_KEYS.accountingLayer,
  ACCOUNTING_SECTION_KEYS.ledgerTrialBalance,
]

function getLedgerRowKey(entry = {}) {
  return [
    entry.voucherId,
    entry.date,
    entry.sourceType,
    entry.debitAccount,
    entry.creditAccount,
    entry.amount,
  ]
    .map((value) => String(value || ''))
    .join('::')
}

export function AccountingModule({ authToken, onNotice }) {
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: toISODate(),
  })
  const [ledgerEntries, setLedgerEntries] = useState([])
  const [trialRows, setTrialRows] = useState([])
  const [trialTotals, setTrialTotals] = useState({ debit: 0, credit: 0 })
  const [fundRows, setFundRows] = useState([])
  const [fundTotals, setFundTotals] = useState({ totalIncome: 0, totalExpense: 0, netSurplus: 0 })
  const [ledgerQuery, setLedgerQuery] = useState('')
  const [trialQuery, setTrialQuery] = useState('')
  const [selectedLedgerKey, setSelectedLedgerKey] = useState('')

  const {
    collapsedSections,
    areAllVisibleSectionsCollapsed,
    areAllVisibleSectionsExpanded,
    toggleSection,
    setAllVisibleSections,
  } = usePanelSections(ACCOUNTING_ALL_SECTION_KEYS)

  async function loadAccounting() {
    if (!authToken) return

    setLoading(true)
    try {
      const query = new URLSearchParams()
      if (filters.fromDate) query.set('fromDate', filters.fromDate)
      if (filters.toDate) query.set('toDate', filters.toDate)
      const qs = query.toString() ? `?${query.toString()}` : ''

      const [ledgerRes, trialRes, fundRes] = await Promise.all([
        apiRequest(`/accounting/ledger${qs}`, { token: authToken }),
        apiRequest(`/accounting/trial-balance${qs}`, { token: authToken }),
        apiRequest(`/accounting/fund-balance${qs}`, { token: authToken }),
      ])

      const nextLedger = ledgerRes.entries || []
      setLedgerEntries(nextLedger)
      setTrialRows(trialRes.rows || [])
      setTrialTotals(trialRes.totals || { debit: 0, credit: 0 })
      setFundRows(fundRes.byFund || [])
      setFundTotals(fundRes.totals || { totalIncome: 0, totalExpense: 0, netSurplus: 0 })
      setSelectedLedgerKey((current) =>
        nextLedger.some((entry) => getLedgerRowKey(entry) === current) ? current : '',
      )
    } catch (error) {
      onNotice('error', error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAccounting()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken])

  const visibleLedgerEntries = useMemo(() => {
    const query = ledgerQuery.trim().toLowerCase()
    if (!query) return ledgerEntries
    return ledgerEntries.filter((entry) =>
      [
        entry.voucherId,
        entry.sourceType,
        entry.debitAccount,
        entry.creditAccount,
        entry.date,
        String(entry.amount),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    )
  }, [ledgerEntries, ledgerQuery])

  const visibleTrialRows = useMemo(() => {
    const query = trialQuery.trim().toLowerCase()
    if (!query) return trialRows
    return trialRows.filter((row) =>
      [row.account, String(row.debit), String(row.credit)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    )
  }, [trialRows, trialQuery])

  const selectedLedgerEntry = useMemo(
    () => ledgerEntries.find((entry) => getLedgerRowKey(entry) === selectedLedgerKey) || null,
    [ledgerEntries, selectedLedgerKey],
  )

  const visibleTrialTotals = useMemo(
    () =>
      visibleTrialRows.reduce(
        (accumulator, row) => ({
          debit: accumulator.debit + (Number(row.debit) || 0),
          credit: accumulator.credit + (Number(row.credit) || 0),
        }),
        { debit: 0, credit: 0 },
      ),
    [visibleTrialRows],
  )

  const ledgerAmountTotal = useMemo(
    () => visibleLedgerEntries.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0),
    [visibleLedgerEntries],
  )

  const hasViewFilters = Boolean(ledgerQuery.trim() || trialQuery.trim())
  const hasDateFilters = Boolean(filters.fromDate || filters.toDate)

  function clearViewFilters() {
    setLedgerQuery('')
    setTrialQuery('')
    setSelectedLedgerKey('')
  }

  function clearDateFilters() {
    setFilters({ fromDate: '', toDate: toISODate() })
  }

  return (
    <section
      className={
        selectedLedgerEntry
          ? 'panel-grid two-column accounting-page accounting-page-with-detail'
          : 'panel-grid two-column accounting-page'
      }
    >
      <PanelCollapseActions
        areAllVisibleSectionsCollapsed={areAllVisibleSectionsCollapsed}
        areAllVisibleSectionsExpanded={areAllVisibleSectionsExpanded}
        setAllVisibleSections={setAllVisibleSections}
      />

      <article className="panel accounting-shell">
        <div className="panel-head">
          <h2>Accounting Command Center</h2>
          <p>General ledger, trial balance, and fund surplus tracking with clear audit visibility.</p>
        </div>

        <div className="accounting-overview-grid">
          <div className="accounting-overview-card is-success">
            <span>Total Income</span>
            <strong>{formatCurrency(fundTotals.totalIncome)}</strong>
            <small>fund-based collections</small>
          </div>
          <div className="accounting-overview-card is-warning">
            <span>Total Expense</span>
            <strong>{formatCurrency(fundTotals.totalExpense)}</strong>
            <small>approved vouchers</small>
          </div>
          <div
            className={
              fundTotals.netSurplus < 0
                ? 'accounting-overview-card is-alert'
                : 'accounting-overview-card is-muted'
            }
          >
            <span>Net Surplus</span>
            <strong>{formatCurrency(fundTotals.netSurplus)}</strong>
            <small>{fundTotals.netSurplus < 0 ? 'deficit state' : 'healthy balance'}</small>
          </div>
          <div className="accounting-overview-card">
            <span>Ledger Rows</span>
            <strong>{visibleLedgerEntries.length}</strong>
            <small>{formatCurrency(ledgerAmountTotal)} visible amount</small>
          </div>
        </div>

        <div className="accounting-toolbar">
          <label className="accounting-toolbar-field">
            From Date
            <input
              type="date"
              value={filters.fromDate}
              onChange={(event) => setFilters((current) => ({ ...current, fromDate: event.target.value }))}
            />
          </label>
          <label className="accounting-toolbar-field">
            To Date
            <input
              type="date"
              value={filters.toDate}
              onChange={(event) => setFilters((current) => ({ ...current, toDate: event.target.value }))}
            />
          </label>
          <label className="accounting-toolbar-field">
            Search Ledger
            <input
              value={ledgerQuery}
              onChange={(event) => setLedgerQuery(event.target.value)}
              placeholder="Voucher, account, source, amount"
            />
          </label>
          <label className="accounting-toolbar-field">
            Search Trial Accounts
            <input
              value={trialQuery}
              onChange={(event) => setTrialQuery(event.target.value)}
              placeholder="Account, debit, credit"
            />
          </label>
          <div className="accounting-toolbar-actions">
            <span className="hint">Ledger {visibleLedgerEntries.length} | Trial {visibleTrialRows.length}</span>
            <button type="button" className="secondary-btn" onClick={loadAccounting} disabled={loading}>
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
            {hasDateFilters && (
              <button type="button" className="secondary-btn" onClick={clearDateFilters}>
                Clear Dates
              </button>
            )}
            {hasViewFilters && (
              <button type="button" className="secondary-btn" onClick={clearViewFilters}>
                Clear Search
              </button>
            )}
          </div>
        </div>
      </article>

      {selectedLedgerEntry && (
        <article className="panel accounting-detail-card">
          <div className="accounting-detail-head">
            <h2>Voucher Details</h2>
            <div className="accounting-detail-meta">
              <span className="accounting-text-mono">{selectedLedgerEntry.voucherId || '-'}</span>
              <span className="accounting-source-pill">{selectedLedgerEntry.sourceType || '-'}</span>
            </div>
          </div>

          <div className="accounting-detail-stats">
            <div>
              <span>Date</span>
              <strong>{formatDate(selectedLedgerEntry.date)}</strong>
            </div>
            <div>
              <span>Amount</span>
              <strong>{formatCurrency(selectedLedgerEntry.amount)}</strong>
            </div>
            <div>
              <span>Debit</span>
              <strong>{selectedLedgerEntry.debitAccount || '-'}</strong>
            </div>
            <div>
              <span>Credit</span>
              <strong>{selectedLedgerEntry.creditAccount || '-'}</strong>
            </div>
          </div>

          <div className="table-wrap compact">
            <table>
              <tbody>
                <tr>
                  <th>Voucher</th>
                  <td className="accounting-text-mono">{selectedLedgerEntry.voucherId || '-'}</td>
                </tr>
                <tr>
                  <th>Source</th>
                  <td>{selectedLedgerEntry.sourceType || '-'}</td>
                </tr>
                <tr>
                  <th>Date</th>
                  <td>{formatDate(selectedLedgerEntry.date)}</td>
                </tr>
                <tr>
                  <th>Debit Account</th>
                  <td>{selectedLedgerEntry.debitAccount || '-'}</td>
                </tr>
                <tr>
                  <th>Credit Account</th>
                  <td>{selectedLedgerEntry.creditAccount || '-'}</td>
                </tr>
                <tr>
                  <th>Amount</th>
                  <td>{formatCurrency(selectedLedgerEntry.amount)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="action-row">
            <button type="button" className="secondary-btn" onClick={() => setSelectedLedgerKey('')}>
              Back to Ledger
            </button>
          </div>
        </article>
      )}

      <article className="panel accounting-funds-card">
        <CollapsiblePanelHead
          sectionKey={ACCOUNTING_SECTION_KEYS.accountingLayer}
          collapsedSections={collapsedSections}
          toggleSection={toggleSection}
          controlsId="accounting-layer-panel"
          title="Fund Balance Snapshot"
          subtitle="Collections aggregated by fund for the selected accounting range."
        />
        <div id="accounting-layer-panel" hidden={collapsedSections[ACCOUNTING_SECTION_KEYS.accountingLayer]}>
          <div className="table-wrap compact">
            <table>
              <thead>
                <tr>
                  <th>Fund</th>
                  <th>Collection</th>
                </tr>
              </thead>
              <tbody>
                {fundRows.length === 0 && (
                  <tr>
                    <td colSpan="2">No fund activity for selected range.</td>
                  </tr>
                )}
                {fundRows.map((row) => (
                  <tr key={row.fund}>
                    <td>{row.fund}</td>
                    <td>{formatCurrency(row.amount)}</td>
                  </tr>
                ))}
                {fundRows.length > 0 && (
                  <tr>
                    <td><strong>Total</strong></td>
                    <td><strong>{formatCurrency(fundTotals.totalIncome)}</strong></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </article>

      <article className="panel accounting-ledger-card">
        <CollapsiblePanelHead
          sectionKey={ACCOUNTING_SECTION_KEYS.ledgerTrialBalance}
          collapsedSections={collapsedSections}
          toggleSection={toggleSection}
          controlsId="accounting-ledger-trial-panel"
          title="Ledger & Trial Balance"
          subtitle="Click any ledger row for voucher details and verify account balance quickly."
        />
        <div
          id="accounting-ledger-trial-panel"
          hidden={collapsedSections[ACCOUNTING_SECTION_KEYS.ledgerTrialBalance]}
        >
          <div className="accounting-ledger-grid">
            <section className="accounting-ledger-block">
              <h3>Ledger Entries</h3>
              <div className="table-wrap compact">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Voucher</th>
                      <th>Type</th>
                      <th>Debit</th>
                      <th>Credit</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleLedgerEntries.length === 0 && (
                      <tr>
                        <td colSpan="6">No ledger entries for this filter.</td>
                      </tr>
                    )}
                    {visibleLedgerEntries.map((entry) => {
                      const rowKey = getLedgerRowKey(entry)
                      const isSelected = rowKey === selectedLedgerKey
                      return (
                        <tr
                          key={rowKey}
                          className={isSelected ? 'accounting-ledger-row is-selected' : 'accounting-ledger-row'}
                          role="button"
                          tabIndex={0}
                          aria-label={`Open voucher ${entry.voucherId || '-'}`}
                          onClick={() => setSelectedLedgerKey(rowKey)}
                          onKeyDown={(event) => {
                            if (event.key !== 'Enter' && event.key !== ' ') return
                            event.preventDefault()
                            setSelectedLedgerKey(rowKey)
                          }}
                        >
                          <td>{formatDate(entry.date)}</td>
                          <td className="accounting-text-mono">{entry.voucherId || '-'}</td>
                          <td>{entry.sourceType || '-'}</td>
                          <td>{entry.debitAccount || '-'}</td>
                          <td>{entry.creditAccount || '-'}</td>
                          <td>{formatCurrency(entry.amount)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="accounting-ledger-block">
              <h3>Trial Balance</h3>
              <div className="table-wrap compact">
                <table>
                  <thead>
                    <tr>
                      <th>Account</th>
                      <th>Debit</th>
                      <th>Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleTrialRows.length === 0 && (
                      <tr>
                        <td colSpan="3">No trial balance rows for this filter.</td>
                      </tr>
                    )}
                    {visibleTrialRows.map((row) => (
                      <tr key={row.account}>
                        <td>{row.account}</td>
                        <td>{formatCurrency(row.debit)}</td>
                        <td>{formatCurrency(row.credit)}</td>
                      </tr>
                    ))}
                    <tr>
                      <td><strong>Visible Total</strong></td>
                      <td><strong>{formatCurrency(visibleTrialTotals.debit)}</strong></td>
                      <td><strong>{formatCurrency(visibleTrialTotals.credit)}</strong></td>
                    </tr>
                    {visibleTrialRows.length !== trialRows.length && (
                      <tr>
                        <td><strong>Overall Total</strong></td>
                        <td><strong>{formatCurrency(trialTotals.debit)}</strong></td>
                        <td><strong>{formatCurrency(trialTotals.credit)}</strong></td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </article>
    </section>
  )
}
