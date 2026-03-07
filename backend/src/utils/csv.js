function parseCsvLine(line) {
  const values = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const next = line[index + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      values.push(current)
      current = ''
      continue
    }

    current += char
  }
  values.push(current)
  return values
}

function parseCsv(text) {
  const source = String(text || '').replace(/\r\n/g, '\n').trim()
  if (!source) return []

  const lines = source
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  if (!lines.length) return []

  const headers = parseCsvLine(lines[0]).map((header) => header.trim())
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line)
    const record = {}
    headers.forEach((header, index) => {
      record[header] = String(values[index] || '').trim()
    })
    return record
  })
}

function escapeCsvValue(value) {
  const text = String(value ?? '')
  if (!/[",\n]/.test(text)) return text
  return `"${text.replace(/"/g, '""')}"`
}

function toCsv(rows, preferredHeaders = []) {
  const items = Array.isArray(rows) ? rows : []
  const headers = preferredHeaders.length
    ? preferredHeaders
    : items.length
      ? Object.keys(items[0])
      : []
  if (!headers.length) return ''

  const lines = [headers.map(escapeCsvValue).join(',')]
  for (const row of items) {
    const serialized = headers.map((header) => escapeCsvValue(row?.[header] ?? '')).join(',')
    lines.push(serialized)
  }
  return lines.join('\n')
}

module.exports = {
  parseCsv,
  toCsv,
}
