const { toISODate } = require('../utils/date')
const { getBookingRange } = require('../utils/bookingRange')

function computeDashboardMetrics({ db, timezone }) {
  const today = toISODate(new Date(), timezone)

  const paidTransactions = db.transactions.filter((transaction) => transaction.status === 'Paid' && !transaction.cancelled)
  const pledgedTransactions = db.transactions.filter(
    (transaction) => transaction.status === 'Pledged' && !transaction.cancelled,
  )

  const todayPaidTotal = paidTransactions
    .filter((transaction) => String(transaction.createdAt).startsWith(today))
    .reduce((sum, transaction) => sum + transaction.amount, 0)

  const pendingPledgeAmount = pledgedTransactions.reduce((sum, transaction) => sum + transaction.amount, 0)
  const overduePledges = pledgedTransactions.filter((transaction) => transaction.dueDate && transaction.dueDate <= today)
  const openCheckouts = db.assetCheckouts.filter((checkout) => checkout.status === 'Checked Out')
  const overdueAssets = openCheckouts.filter(
    (checkout) => checkout.expectedReturnDate && checkout.expectedReturnDate < today,
  )
  const upcomingSlots = db.poojaBookings.filter((booking) => {
    const range = getBookingRange(booking)
    return Boolean(range && range.endDate >= today)
  }).length

  return {
    today,
    todayPaidTotal,
    pendingPledgeAmount,
    overduePledgeCount: overduePledges.length,
    overdueAssetCount: overdueAssets.length,
    openCheckoutCount: openCheckouts.length,
    upcomingSlots,
  }
}

function buildLedgerByFund(transactions) {
  const ledger = {}
  for (const transaction of transactions) {
    if (transaction.cancelled) continue
    const fund = transaction.fundCategory
    ledger[fund] = (ledger[fund] || 0) + transaction.amount
  }
  return ledger
}

function formatMonthLabel(monthKey) {
  const [year, month] = monthKey.split('-').map((value) => Number(value))
  if (!year || !month) return monthKey
  const date = new Date(Date.UTC(year, month - 1, 1))
  return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
}

function buildMonthlyTrend({ transactions, timezone, months = 6 }) {
  const range = []
  const cursor = new Date()
  cursor.setDate(1)
  cursor.setHours(0, 0, 0, 0)
  cursor.setMonth(cursor.getMonth() - (months - 1))

  for (let index = 0; index < months; index += 1) {
    const year = cursor.getFullYear()
    const month = String(cursor.getMonth() + 1).padStart(2, '0')
    range.push(`${year}-${month}`)
    cursor.setMonth(cursor.getMonth() + 1)
  }

  const trend = Object.fromEntries(
    range.map((monthKey) => [
      monthKey,
      {
        month: monthKey,
        label: formatMonthLabel(monthKey),
        paidAmount: 0,
        pledgedAmount: 0,
        paidCount: 0,
        pledgedCount: 0,
      },
    ]),
  )

  for (const transaction of transactions) {
    if (transaction.cancelled) continue
    const createdMonth = String(toISODate(new Date(transaction.createdAt), timezone) || '').slice(0, 7)
    if (!trend[createdMonth]) continue

    if (transaction.status === 'Paid') {
      trend[createdMonth].paidAmount += Number(transaction.amount) || 0
      trend[createdMonth].paidCount += 1
    } else if (transaction.status === 'Pledged') {
      trend[createdMonth].pledgedAmount += Number(transaction.amount) || 0
      trend[createdMonth].pledgedCount += 1
    }
  }

  return range.map((monthKey) => trend[monthKey])
}

function buildPledgeAging({ transactions, timezone }) {
  const today = toISODate(new Date(), timezone)
  const buckets = {
    current: { key: 'current', label: 'Not Yet Due', amount: 0, count: 0 },
    d1_30: { key: 'd1_30', label: '1-30 days overdue', amount: 0, count: 0 },
    d31_60: { key: 'd31_60', label: '31-60 days overdue', amount: 0, count: 0 },
    d61_plus: { key: 'd61_plus', label: '61+ days overdue', amount: 0, count: 0 },
  }

  for (const transaction of transactions) {
    if (transaction.cancelled || transaction.status !== 'Pledged') continue
    if (!transaction.dueDate) continue

    const dueDate = new Date(transaction.dueDate)
    const currentDate = new Date(today)
    const overdueDays = Math.floor((currentDate.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000))
    const amount = Number(transaction.amount) || 0

    if (overdueDays <= 0) {
      buckets.current.amount += amount
      buckets.current.count += 1
    } else if (overdueDays <= 30) {
      buckets.d1_30.amount += amount
      buckets.d1_30.count += 1
    } else if (overdueDays <= 60) {
      buckets.d31_60.amount += amount
      buckets.d31_60.count += 1
    } else {
      buckets.d61_plus.amount += amount
      buckets.d61_plus.count += 1
    }
  }

  return Object.values(buckets)
}

function buildTopContributors({ transactions, families, limit = 10 }) {
  const familyNameById = Object.fromEntries(
    (families || []).map((family) => [family.familyId, family.headName || family.familyId]),
  )
  const ledger = {}

  for (const transaction of transactions) {
    if (transaction.cancelled || transaction.status !== 'Paid') continue
    const familyId = transaction.familyId || 'ANONYMOUS'
    const familyName = transaction.type === 'Gupt Daan' ? 'Anonymous' : familyNameById[familyId] || familyId
    if (!ledger[familyId]) {
      ledger[familyId] = {
        familyId,
        familyName,
        amount: 0,
        count: 0,
      }
    }
    ledger[familyId].amount += Number(transaction.amount) || 0
    ledger[familyId].count += 1
  }

  return Object.values(ledger)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit)
}

module.exports = {
  computeDashboardMetrics,
  buildLedgerByFund,
  buildMonthlyTrend,
  buildPledgeAging,
  buildTopContributors,
}
