const ones = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
]

const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function convertBelowHundred(number) {
  if (number < 20) return ones[number]

  const ten = Math.floor(number / 10)
  const unit = number % 10
  return `${tens[ten]}${unit ? ` ${ones[unit]}` : ''}`
}

function convertBelowThousand(number) {
  if (number < 100) return convertBelowHundred(number)

  const hundred = Math.floor(number / 100)
  const remainder = number % 100
  return `${ones[hundred]} Hundred${remainder ? ` ${convertBelowHundred(remainder)}` : ''}`
}

function convertIndian(number) {
  if (number === 0) return 'Zero'

  const parts = []
  let remainder = number

  const crore = Math.floor(remainder / 10000000)
  remainder %= 10000000
  if (crore) parts.push(`${convertBelowThousand(crore)} Crore`)

  const lakh = Math.floor(remainder / 100000)
  remainder %= 100000
  if (lakh) parts.push(`${convertBelowThousand(lakh)} Lakh`)

  const thousand = Math.floor(remainder / 1000)
  remainder %= 1000
  if (thousand) parts.push(`${convertBelowThousand(thousand)} Thousand`)

  if (remainder) parts.push(convertBelowThousand(remainder))
  return parts.join(' ').trim()
}

function numberToIndianWords(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount < 0) return 'Invalid Amount'

  const rupees = Math.floor(amount)
  const paise = Math.round((amount - rupees) * 100)
  if (!paise) return `${convertIndian(rupees)} Rupees Only`

  return `${convertIndian(rupees)} Rupees and ${convertIndian(paise)} Paise Only`
}

module.exports = { numberToIndianWords }

