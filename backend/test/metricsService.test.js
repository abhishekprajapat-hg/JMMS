const test = require('node:test')
const assert = require('node:assert/strict')
const { buildMonthlyTrend, buildPledgeAging, buildTopContributors } = require('../src/services/metricsService')

function daysAgo(days) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString()
}

test('buildMonthlyTrend returns six months and aggregates paid/pledged totals', () => {
  const transactions = [
    {
      id: 'TRX-1',
      status: 'Paid',
      cancelled: false,
      amount: 1000,
      createdAt: daysAgo(5),
    },
    {
      id: 'TRX-2',
      status: 'Pledged',
      cancelled: false,
      amount: 500,
      createdAt: daysAgo(2),
    },
  ]
  const trend = buildMonthlyTrend({
    transactions,
    timezone: 'Asia/Kolkata',
    months: 6,
  })
  assert.equal(trend.length, 6)
  const paidTotal = trend.reduce((sum, item) => sum + item.paidAmount, 0)
  const pledgedTotal = trend.reduce((sum, item) => sum + item.pledgedAmount, 0)
  assert.equal(paidTotal, 1000)
  assert.equal(pledgedTotal, 500)
})

test('buildPledgeAging and buildTopContributors produce categorized output', () => {
  const transactions = [
    {
      id: 'TRX-1',
      familyId: 'FAM-0001',
      type: 'Bhent',
      status: 'Paid',
      cancelled: false,
      amount: 2000,
      dueDate: '',
      createdAt: daysAgo(1),
    },
    {
      id: 'TRX-2',
      familyId: 'FAM-0002',
      type: 'Boli',
      status: 'Pledged',
      cancelled: false,
      amount: 3000,
      dueDate: daysAgo(40).slice(0, 10),
      createdAt: daysAgo(40),
    },
  ]
  const families = [
    { familyId: 'FAM-0001', headName: 'Family One' },
    { familyId: 'FAM-0002', headName: 'Family Two' },
  ]

  const aging = buildPledgeAging({
    transactions,
    timezone: 'Asia/Kolkata',
  })
  assert.equal(Array.isArray(aging), true)
  assert.equal(aging.length, 4)
  assert.equal(aging.some((bucket) => bucket.count > 0), true)

  const top = buildTopContributors({ transactions, families, limit: 10 })
  assert.equal(top.length, 1)
  assert.equal(top[0].familyName, 'Family One')
  assert.equal(top[0].amount, 2000)
})
