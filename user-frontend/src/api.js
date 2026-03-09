const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '')
const API_ORIGIN = API_BASE_URL.endsWith('/api') ? API_BASE_URL.slice(0, -4) : API_BASE_URL

function normalizePath(path) {
  return path.startsWith('/') ? path : `/${path}`
}

async function parsePayload(response) {
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return response.json().catch(() => ({}))
  }
  const text = await response.text().catch(() => '')
  return text ? { message: text } : {}
}

async function apiRequest(path, { token = '', method = 'GET', body } = {}) {
  const response = await fetch(`${API_BASE_URL}${normalizePath(path)}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const payload = await parsePayload(response)
  if (!response.ok) {
    throw new Error(payload.error || payload.message || `Request failed with status ${response.status}`)
  }
  return payload
}

function toAbsoluteUrl(path) {
  if (!path) return ''
  if (/^https?:\/\//.test(path)) return path
  if (!path.startsWith('/')) return `${API_ORIGIN}/${path}`
  return `${API_ORIGIN}${path}`
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)
}

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function toISODate() {
  return new Date().toISOString().slice(0, 10)
}

export {
  apiRequest,
  formatCurrency,
  formatDate,
  toISODate,
  toAbsoluteUrl,
}
