const test = require('node:test')
const assert = require('node:assert/strict')
const { parseCsv, toCsv } = require('../src/utils/csv')

test('toCsv and parseCsv round-trip quoted values', () => {
  const input = [
    {
      familyId: 'FAM-0001',
      headName: 'Amit Jain',
      address: 'Bapu Nagar, Jaipur',
    },
    {
      familyId: 'FAM-0002',
      headName: 'Neha "N" Shah',
      address: 'Malviya Nagar, Jaipur',
    },
  ]

  const csv = toCsv(input, ['familyId', 'headName', 'address'])
  const output = parseCsv(csv)

  assert.equal(output.length, 2)
  assert.equal(output[0].familyId, 'FAM-0001')
  assert.equal(output[1].headName, 'Neha "N" Shah')
  assert.equal(output[1].address, 'Malviya Nagar, Jaipur')
})
