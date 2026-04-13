import { useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../services/api'
import { formatCurrency, formatDate, toISODate } from '../utils/validation'

function getInitialForm(categories) {
  return {
    title: '',
    category: categories[0] || '',
    amount: '',
    expenseDate: toISODate(),
    paymentMode: 'Cash',
    vendor: '',
    notes: '',
  }
}

function getStatusClass(status) {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'paid') return 'paid'
  if (normalized === 'approved') return 'approved'
  if (normalized === 'rejected') return 'rejected'
  if (normalized === 'pending approval') return 'pending-approval'
  if (normalized.includes('pending')) return 'pending'
  return 'neutral'
}

function includesQuery(values, query) {
  const needle = String(query || '').trim().toLowerCase()
  if (!needle) return true

  return values.some((value) =>
    String(value || '')
      .toLowerCase()
      .includes(needle),
  )
}

export function ExpensesModule({
  authToken,
  expenseCategories,
  permissions,
  approvalQueue,
  onNotice,
  onRefreshApprovals,
}) {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState(() => getInitialForm(expenseCategories))
  const [activeTab, setActiveTab] = useState(permissions.manageExpenses ? 'create' : 'register')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const expenseApprovals = useMemo(
    () => approvalQueue.filter((approval) => approval.type === 'EXPENSE'),
    [approvalQueue],
  )
  const pendingApprovals = useMemo(
    () => expenseApprovals.filter((approval) => approval.status === 'Pending'),
    [expenseApprovals],
  )

  const allCategories = useMemo(
    () =>
      Array.from(
        new Set([
          ...expenseCategories,
          ...expenses.map((expense) => String(expense.category || '').trim()).filter(Boolean),
        ]),
      ),
    [expenseCategories, expenses],
  )

  const overview = useMemo(() => {
    const paidTotal = expenses
      .filter((expense) => expense.status === 'Paid')
      .reduce((total, expense) => total + (Number(expense.amount) || 0), 0)

    const approvedOutstanding = expenses
      .filter((expense) => expense.status === 'Approved')
      .reduce((total, expense) => total + (Number(expense.amount) || 0), 0)

    const pendingAmount = expenses
      .filter((expense) => expense.status === 'Pending Approval')
      .reduce((total, expense) => total + (Number(expense.amount) || 0), 0)

    return {
      totalVouchers: expenses.length,
      pendingApprovals: pendingApprovals.length,
      paidTotal,
      approvedOutstanding,
      pendingAmount,
    }
  }, [expenses, pendingApprovals])

  const filteredExpenses = useMemo(
    () =>
      expenses.filter((expense) => {
        const matchesStatus = statusFilter === 'all' || expense.status === statusFilter
        if (!matchesStatus) return false

        const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter
        if (!matchesCategory) return false

        return includesQuery(
          [
            expense.id,
            expense.title,
            expense.category,
            expense.vendor,
            expense.paymentMode,
            expense.status,
            expense.notes,
          ],
          query,
        )
      }),
    [expenses, statusFilter, categoryFilter, query],
  )

  const availableTabs = useMemo(() => {
    const tabs = ['register']
    if (permissions.manageExpenses) tabs.unshift('create')
    if (permissions.approveSensitiveActions) tabs.push('approvals')
    return tabs
  }, [permissions.manageExpenses, permissions.approveSensitiveActions])

  async function refreshApprovalsSafe() {
    if (typeof onRefreshApprovals !== 'function') return
    await onRefreshApprovals()
  }

  async function loadExpenses({ silent = false } = {}) {
    if (!authToken) return
    if (!silent) setLoading(true)

    try {
      const response = await apiRequest('/expenses', { token: authToken })
      setExpenses(response.expenses || [])
    } catch (error) {
      onNotice('error', error.message)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  async function refreshDashboard() {
    await loadExpenses()
    if (permissions.approveSensitiveActions) {
      await refreshApprovalsSafe()
    }
  }

  useEffect(() => {
    loadExpenses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken])

  useEffect(() => {
    setForm((current) => ({
      ...current,
      category: expenseCategories.includes(current.category)
        ? current.category
        : expenseCategories[0] || '',
    }))
  }, [expenseCategories])

  useEffect(() => {
    if (!availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0] || 'register')
    }
  }, [availableTabs, activeTab])

  async function handleSubmit(event) {
    event.preventDefault()
    if (!form.title || !form.category || !form.amount || !form.expenseDate) {
      onNotice('error', 'Title, category, amount, and expense date are required.')
      return
    }

    setLoading(true)
    try {
      const response = await apiRequest('/expenses', {
        method: 'POST',
        token: authToken,
        body: {
          ...form,
          amount: Number(form.amount),
        },
      })

      setExpenses((current) => [response.expense, ...current])
      setForm(getInitialForm(expenseCategories))
      setActiveTab('register')
      if (response.approvalRequest) {
        await refreshApprovalsSafe()
        onNotice('success', `Expense submitted for approval (${response.approvalRequest.id}).`)
      } else {
        onNotice('success', `Expense ${response.expense.id} created.`)
      }
    } catch (error) {
      onNotice('error', error.message)
    } finally {
      setLoading(false)
    }
  }

  async function markPaid(expenseId) {
    setLoading(true)
    try {
      const response = await apiRequest(`/expenses/${expenseId}/pay`, {
        method: 'POST',
        token: authToken,
      })
      setExpenses((current) =>
        current.map((expense) => (expense.id === expenseId ? response.expense : expense)),
      )
      onNotice('success', `Expense ${expenseId} marked paid.`)
    } catch (error) {
      onNotice('error', error.message)
    } finally {
      setLoading(false)
    }
  }

  async function decideApproval(approvalId, decision) {
    setLoading(true)
    try {
      await apiRequest(`/approvals/${approvalId}/${decision}`, {
        method: 'POST',
        token: authToken,
        body: { note: '' },
      })
      await refreshApprovalsSafe()
      await loadExpenses({ silent: true })
      setActiveTab('approvals')
      onNotice('success', `Expense approval ${approvalId} ${decision}d.`)
    } catch (error) {
      onNotice('error', error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="panel-grid expenses-page">
      <article className="panel expenses-shell">
        <div className="expenses-shell-head">
          <div className="panel-head">
            <h2>Expense Operations Desk</h2>
            <p>Create vouchers, monitor cash outflow, and process approval queues in one place.</p>
          </div>
          <div className="expenses-shell-actions">
            <div className="expenses-live-state" aria-live="polite">
              <span className={`expenses-live-dot${loading ? ' is-loading' : ''}`} />
              {loading ? 'Sync in progress' : 'Live data'}
            </div>
            <button
              type="button"
              className="secondary-btn"
              onClick={refreshDashboard}
              disabled={loading}
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="expenses-overview-grid">
          <div className="expenses-overview-card">
            <span>Total Vouchers</span>
            <strong>{overview.totalVouchers}</strong>
            <small>All expense records</small>
          </div>
          <div className="expenses-overview-card is-warning">
            <span>Pending Approval</span>
            <strong>{overview.pendingApprovals}</strong>
            <small>{formatCurrency(overview.pendingAmount)} waiting</small>
          </div>
          <div className="expenses-overview-card is-muted">
            <span>Approved Unpaid</span>
            <strong>{formatCurrency(overview.approvedOutstanding)}</strong>
            <small>Ready to disburse</small>
          </div>
          <div className="expenses-overview-card is-success">
            <span>Total Paid</span>
            <strong>{formatCurrency(overview.paidTotal)}</strong>
            <small>Cleared vouchers</small>
          </div>
        </div>

        <div className="expenses-tabs" role="tablist" aria-label="Expense workflows">
          {permissions.manageExpenses ? (
            <button
              type="button"
              className={`expenses-tab-btn${activeTab === 'create' ? ' active' : ''}`}
              onClick={() => setActiveTab('create')}
            >
              Create Voucher
            </button>
          ) : null}
          <button
            type="button"
            className={`expenses-tab-btn${activeTab === 'register' ? ' active' : ''}`}
            onClick={() => setActiveTab('register')}
          >
            Expense Register
          </button>
          {permissions.approveSensitiveActions ? (
            <button
              type="button"
              className={`expenses-tab-btn${activeTab === 'approvals' ? ' active' : ''}`}
              onClick={() => setActiveTab('approvals')}
            >
              Approval Queue ({pendingApprovals.length})
            </button>
          ) : null}
        </div>

        {activeTab === 'create' ? (
          permissions.manageExpenses ? (
            <form className="stack-form expenses-form-grid" onSubmit={handleSubmit}>
              <label>
                Expense Title
                <input
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                />
              </label>

              <label>
                Category
                <select
                  value={form.category}
                  onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                >
                  {expenseCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
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
                Expense Date
                <input
                  type="date"
                  value={form.expenseDate}
                  onChange={(event) => setForm((current) => ({ ...current, expenseDate: event.target.value }))}
                />
              </label>

              <label>
                Payment Mode
                <input
                  value={form.paymentMode}
                  onChange={(event) => setForm((current) => ({ ...current, paymentMode: event.target.value }))}
                  placeholder="Cash / UPI / Bank Transfer"
                />
              </label>

              <label>
                Vendor
                <input
                  value={form.vendor}
                  onChange={(event) => setForm((current) => ({ ...current, vendor: event.target.value }))}
                />
              </label>

              <label className="expenses-form-span-2">
                Notes
                <textarea
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                />
              </label>

              <div className="action-row expenses-form-span-2">
                <button type="submit" disabled={loading}>Create Expense Voucher</button>
              </div>
            </form>
          ) : (
            <p className="hint">Your role can view expenses only.</p>
          )
        ) : null}

        {activeTab === 'register' ? (
          <div className="expenses-data-surface">
            <div className="expenses-toolbar">
              <label className="expenses-toolbar-field">
                Search
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by id, title, category, vendor, mode, notes"
                />
              </label>
              <label className="expenses-toolbar-field">
                Status
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option value="all">All</option>
                  <option value="Pending Approval">Pending Approval</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Paid">Paid</option>
                </select>
              </label>
              <label className="expenses-toolbar-field">
                Category
                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                >
                  <option value="all">All Categories</option>
                  {allCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Expense ID</th>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Vendor</th>
                    <th>Mode</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan="9">No expenses found for current filters.</td>
                    </tr>
                  ) : (
                    filteredExpenses.map((expense) => (
                      <tr key={expense.id}>
                        <td>{expense.id}</td>
                        <td>{expense.title}</td>
                        <td>{expense.category}</td>
                        <td>{expense.vendor || '-'}</td>
                        <td>{expense.paymentMode || '-'}</td>
                        <td>{formatCurrency(expense.amount)}</td>
                        <td>
                          <span className={`expenses-status-badge is-${getStatusClass(expense.status)}`}>
                            {expense.status}
                          </span>
                        </td>
                        <td>{formatDate(expense.expenseDate)}</td>
                        <td>
                          {expense.status === 'Approved' && permissions.manageExpenses ? (
                            <button
                              type="button"
                              className="secondary-btn"
                              onClick={() => markPaid(expense.id)}
                              disabled={loading}
                            >
                              Mark Paid
                            </button>
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {activeTab === 'approvals' ? (
          permissions.approveSensitiveActions ? (
            <div className="expenses-data-surface">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Approval ID</th>
                      <th>Expense Ref</th>
                      <th>Requested By</th>
                      <th>Requested At</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenseApprovals.length === 0 ? (
                      <tr>
                        <td colSpan="6">No expense approvals pending.</td>
                      </tr>
                    ) : (
                      expenseApprovals.map((approval) => (
                        <tr key={approval.id}>
                          <td>{approval.id}</td>
                          <td>{approval.payload?.expenseId || '-'}</td>
                          <td>{approval.requestedByName || approval.requestedBy}</td>
                          <td>{formatDate(approval.requestedAt)}</td>
                          <td>
                            <span className={`expenses-status-badge is-${getStatusClass(approval.status)}`}>
                              {approval.status}
                            </span>
                          </td>
                          <td>
                            {approval.status === 'Pending' ? (
                              <div className="action-row table-action-row">
                                <button
                                  type="button"
                                  className="secondary-btn"
                                  onClick={() => decideApproval(approval.id, 'approve')}
                                  disabled={loading}
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  className="secondary-btn"
                                  onClick={() => decideApproval(approval.id, 'reject')}
                                  disabled={loading}
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span className="hint">
                                Reviewed by {approval.reviewedByName || approval.reviewedBy || '-'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="hint">Your role cannot approve expense requests.</p>
          )
        ) : null}
      </article>
    </section>
  )
}
