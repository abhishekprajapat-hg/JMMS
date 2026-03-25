const test = require('node:test')
const assert = require('node:assert/strict')

const { normalizeReceiptRequestUrl } = require('../src/app')

test('normalizeReceiptRequestUrl leaves a clean receipt path unchanged', () => {
  assert.equal(
    normalizeReceiptRequestUrl('/TRX-MN334BQK-LZK0.pdf'),
    '/TRX-MN334BQK-LZK0.pdf',
  )
})

test('normalizeReceiptRequestUrl strips a leaked WhatsApp template placeholder prefix', () => {
  assert.equal(
    normalizeReceiptRequestUrl('/%7B%7B1%7D%7DTRX-MN334BQK-LZK0.pdf'),
    '/TRX-MN334BQK-LZK0.pdf',
  )
})
