function normalizeDate(value) {
  return String(value || '').slice(0, 10)
}

function isWithinRange(date, fromDate, toDate) {
  if (!date) return false
  if (fromDate && date < fromDate) return false
  if (toDate && date > toDate) return false
  return true
}

function buildLedgerEntries(db, { fromDate = '', toDate = '' } = {}) {
  const entries = []

  for (const transaction of db.transactions || []) {
    if (!transaction || transaction.cancelled || transaction.status !== 'Paid') continue

    const date = normalizeDate(transaction.paidAt || transaction.createdAt)
    if (!isWithinRange(date, fromDate, toDate)) continue

    entries.push({
      date,
      voucherId: transaction.id,
      sourceType: 'Donation',
      description: `${transaction.type} donation (${transaction.fundCategory})`,
      debitAccount: 'Cash/Bank',
      creditAccount: `Fund:${transaction.fundCategory}`,
      amount: Number(transaction.amount) || 0,
    })
  }

  for (const expense of db.expenses || []) {
    if (!expense || expense.status !== 'Paid') continue

    const date = normalizeDate(expense.paidAt || expense.expenseDate || expense.createdAt)
    if (!isWithinRange(date, fromDate, toDate)) continue

    entries.push({
      date,
      voucherId: expense.id,
      sourceType: 'Expense',
      description: expense.title || expense.category,
      debitAccount: `Expense:${expense.category || 'Misc'}`,
      creditAccount: 'Cash/Bank',
      amount: Number(expense.amount) || 0,
    })
  }

  entries.sort((a, b) => `${b.date}|${b.voucherId}`.localeCompare(`${a.date}|${a.voucherId}`))
  return entries
}

function buildTrialBalance(entries) {
  const accountMap = new Map()

  function addSide(account, side, amount) {
    if (!account) return
    const current = accountMap.get(account) || { account, debit: 0, credit: 0 }
    current[side] += amount
    accountMap.set(account, current)
  }

  for (const entry of entries) {
    const amount = Number(entry.amount) || 0
    addSide(entry.debitAccount, 'debit', amount)
    addSide(entry.creditAccount, 'credit', amount)
  }

  const rows = Array.from(accountMap.values()).sort((a, b) => a.account.localeCompare(b.account))
  const totals = rows.reduce(
    (sum, row) => ({
      debit: sum.debit + row.debit,
      credit: sum.credit + row.credit,
    }),
    { debit: 0, credit: 0 },
  )

  return { rows, totals }
}

function buildFundBalance(db, { fromDate = '', toDate = '' } = {}) {
  const map = new Map()
  let totalIncome = 0
  let totalExpense = 0

  for (const transaction of db.transactions || []) {
    if (!transaction || transaction.cancelled || transaction.status !== 'Paid') continue
    const date = normalizeDate(transaction.paidAt || transaction.createdAt)
    if (!isWithinRange(date, fromDate, toDate)) continue

    const fund = transaction.fundCategory || 'General Fund'
    const amount = Number(transaction.amount) || 0
    map.set(fund, (map.get(fund) || 0) + amount)
    totalIncome += amount
  }

  for (const expense of db.expenses || []) {
    if (!expense || expense.status !== 'Paid') continue
    const date = normalizeDate(expense.paidAt || expense.expenseDate || expense.createdAt)
    if (!isWithinRange(date, fromDate, toDate)) continue
    totalExpense += Number(expense.amount) || 0
  }

  const byFund = Array.from(map.entries())
    .map(([fund, amount]) => ({ fund, amount }))
    .sort((a, b) => b.amount - a.amount)

  return {
    byFund,
    totals: {
      totalIncome,
      totalExpense,
      netSurplus: totalIncome - totalExpense,
    },
  }
}

module.exports = {
  buildLedgerEntries,
  buildTrialBalance,
  buildFundBalance,
}
