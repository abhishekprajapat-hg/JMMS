import { useEffect, useState } from 'react'
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

  async function loadExpenses() {
    if (!authToken) return
    setLoading(true)
    try {
      const response = await apiRequest('/expenses', { token: authToken })
      setExpenses(response.expenses || [])
    } catch (error) {
      onNotice('error', error.message)
    } finally {
      setLoading(false)
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
      if (response.approvalRequest) {
        await onRefreshApprovals()
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
      await onRefreshApprovals()
      await loadExpenses()
      onNotice('success', `Expense approval ${approvalId} ${decision}d.`)
    } catch (error) {
      onNotice('error', error.message)
    } finally {
      setLoading(false)
    }
  }

  const expenseApprovals = approvalQueue.filter((approval) => approval.type === 'EXPENSE')

  return (
    <section className="panel-grid two-column">
      <article className="panel">
        <div className="panel-head">
          <h2>Expense Management + Approvals</h2>
          <p>Create operational expense vouchers and route approvals automatically.</p>
        </div>

        {permissions.manageExpenses ? (
          <form className="stack-form" onSubmit={handleSubmit}>
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

            <label>
              Notes
              <textarea
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              />
            </label>

            <button type="submit" disabled={loading}>Create Expense Voucher</button>
          </form>
        ) : (
          <p className="hint">Your role can view expenses only.</p>
        )}
      </article>

      <article className="panel">
        <div className="panel-head">
          <h2>Expense Register</h2>
          <p>Pending, approved, rejected, and paid vouchers in one ledger.</p>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Expense ID</th>
                <th>Title</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 && (
                <tr>
                  <td colSpan="7">No expenses recorded yet.</td>
                </tr>
              )}
              {expenses.map((expense) => (
                <tr key={expense.id}>
                  <td>{expense.id}</td>
                  <td>{expense.title}</td>
                  <td>{expense.category}</td>
                  <td>{formatCurrency(expense.amount)}</td>
                  <td>{expense.status}</td>
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
              ))}
            </tbody>
          </table>
        </div>

        {permissions.approveSensitiveActions && (
          <div className="table-wrap compact">
            <table>
              <thead>
                <tr>
                  <th>Approval ID</th>
                  <th>Expense Ref</th>
                  <th>Requested By</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {expenseApprovals.length === 0 && (
                  <tr>
                    <td colSpan="5">No expense approvals pending.</td>
                  </tr>
                )}
                {expenseApprovals.map((approval) => (
                  <tr key={approval.id}>
                    <td>{approval.id}</td>
                    <td>{approval.payload?.expenseId || '-'}</td>
                    <td>{approval.requestedByName || approval.requestedBy}</td>
                    <td>{approval.status}</td>
                    <td>
                      {approval.status === 'Pending' ? (
                        <div className="action-row">
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
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  )
}
