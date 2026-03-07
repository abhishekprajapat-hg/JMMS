import { useEffect, useState } from 'react'
import { apiRequest } from '../services/api'
import { formatCurrency, formatDate, toISODate } from '../utils/validation'

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

      setLedgerEntries(ledgerRes.entries || [])
      setTrialRows(trialRes.rows || [])
      setTrialTotals(trialRes.totals || { debit: 0, credit: 0 })
      setFundRows(fundRes.byFund || [])
      setFundTotals(fundRes.totals || { totalIncome: 0, totalExpense: 0, netSurplus: 0 })
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

  async function handleFilterSubmit(event) {
    event.preventDefault()
    await loadAccounting()
  }

  return (
    <section className="panel-grid two-column">
      <article className="panel">
        <div className="panel-head">
          <h2>Accounting Layer</h2>
          <p>General ledger, trial balance, and fund-wise surplus view.</p>
        </div>

        <form className="stack-form" onSubmit={handleFilterSubmit}>
          <label>
            From Date
            <input
              type="date"
              value={filters.fromDate}
              onChange={(event) => setFilters((current) => ({ ...current, fromDate: event.target.value }))}
            />
          </label>
          <label>
            To Date
            <input
              type="date"
              value={filters.toDate}
              onChange={(event) => setFilters((current) => ({ ...current, toDate: event.target.value }))}
            />
          </label>
          <button type="submit" disabled={loading}>Refresh Accounting</button>
        </form>

        <div className="stats-inline">
          <div>
            <span>Total Income</span>
            <strong>{formatCurrency(fundTotals.totalIncome)}</strong>
          </div>
          <div>
            <span>Total Expense</span>
            <strong>{formatCurrency(fundTotals.totalExpense)}</strong>
          </div>
          <div>
            <span>Net Surplus</span>
            <strong>{formatCurrency(fundTotals.netSurplus)}</strong>
          </div>
        </div>

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
            </tbody>
          </table>
        </div>
      </article>

      <article className="panel">
        <div className="panel-head">
          <h2>Ledger & Trial Balance</h2>
          <p>Double-entry accounting output generated from donations and approved expenses.</p>
        </div>

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
              {ledgerEntries.length === 0 && (
                <tr>
                  <td colSpan="6">No ledger entries for selected range.</td>
                </tr>
              )}
              {ledgerEntries.map((entry) => (
                <tr key={`${entry.voucherId}-${entry.date}-${entry.debitAccount}`}>
                  <td>{formatDate(entry.date)}</td>
                  <td>{entry.voucherId}</td>
                  <td>{entry.sourceType}</td>
                  <td>{entry.debitAccount}</td>
                  <td>{entry.creditAccount}</td>
                  <td>{formatCurrency(entry.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

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
              {trialRows.length === 0 && (
                <tr>
                  <td colSpan="3">No trial balance rows yet.</td>
                </tr>
              )}
              {trialRows.map((row) => (
                <tr key={row.account}>
                  <td>{row.account}</td>
                  <td>{formatCurrency(row.debit)}</td>
                  <td>{formatCurrency(row.credit)}</td>
                </tr>
              ))}
              <tr>
                <td><strong>Total</strong></td>
                <td><strong>{formatCurrency(trialTotals.debit)}</strong></td>
                <td><strong>{formatCurrency(trialTotals.credit)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
    </section>
  )
}
