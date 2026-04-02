import { Platform } from 'react-native'
import { safeFormatCurrency, safeFormatDate } from '../utils/intlSafe'

function resolveApiBaseUrl() {
  const configured = String(process.env.EXPO_PUBLIC_API_BASE_URL || '').trim()
  if (configured) {
    return configured.replace(/\/+$/, '')
  }

  const localHost = Platform.select({
    android: 'http://10.0.2.2:4000/api',
    ios: 'http://localhost:4000/api',
    default: 'http://localhost:4000/api',
  })

  return localHost.replace(/\/+$/, '')
}

export const API_BASE_URL = resolveApiBaseUrl()
export const API_ORIGIN = API_BASE_URL.endsWith('/api') ? API_BASE_URL.slice(0, -4) : API_BASE_URL

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

export async function apiRequest(path, { token = '', method = 'GET', body } = {}) {
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

export function toAbsoluteUrl(path) {
  if (!path) return ''
  if (/^https?:\/\//.test(path)) return path
  if (!path.startsWith('/')) return `${API_ORIGIN}/${path}`
  return `${API_ORIGIN}${path}`
}

export function formatCurrency(value) {
  return safeFormatCurrency(value, 'en-IN', {
    currency: 'INR',
    maximumFractionDigits: 0,
  })
}

export function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return safeFormatDate(date, 'en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function toISODate() {
  return new Date().toISOString().slice(0, 10)
}
