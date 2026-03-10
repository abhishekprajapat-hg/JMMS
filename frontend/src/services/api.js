const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '')
const API_ORIGIN = API_BASE_URL.endsWith('/api') ? API_BASE_URL.slice(0, -4) : API_BASE_URL
const DEFAULT_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS) || 12000

function normalizePath(path) {
  return path.startsWith('/') ? path : `/${path}`
}

function getTimeoutError(timeoutMs) {
  const seconds = Math.max(1, Math.round(timeoutMs / 1000))
  return new Error(`Backend request timed out after ${seconds}s. Verify backend is running and reachable.`)
}

function createAbortController(signal) {
  const controller = new AbortController()
  if (signal) {
    if (signal.aborted) {
      controller.abort(signal.reason)
    } else {
      signal.addEventListener(
        'abort',
        () => {
          controller.abort(signal.reason)
        },
        { once: true },
      )
    }
  }
  return controller
}

async function parsePayload(response) {
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return response.json().catch(() => ({}))
  }
  const text = await response.text().catch(() => '')
  return text ? { message: text } : {}
}

async function apiRequest(path, { token = '', method = 'GET', body, headers = {}, timeoutMs = DEFAULT_TIMEOUT_MS, signal } = {}) {
  const controller = createAbortController(signal)
  const timeoutId = setTimeout(() => controller.abort('timeout'), timeoutMs)

  try {
    const response = await fetch(`${API_BASE_URL}${normalizePath(path)}`, {
      method,
      cache: 'no-store',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })

    const payload = await parsePayload(response)

    if (!response.ok) {
      throw new Error(payload.error || payload.message || `Request failed with status ${response.status}`)
    }

    return payload
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw getTimeoutError(timeoutMs)
    }

    if (error instanceof TypeError) {
      throw new Error('Unable to reach backend. Check API URL, server status, and CORS settings.')
    }

    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

async function pingBackend({ timeoutMs = 4000, signal } = {}) {
  const controller = createAbortController(signal)
  const timeoutId = setTimeout(() => controller.abort('timeout'), timeoutMs)

  try {
    const response = await fetch(`${API_ORIGIN}/health`, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    })
    const payload = await parsePayload(response)
    return {
      ok: response.ok,
      status: response.status,
      payload,
    }
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw getTimeoutError(timeoutMs)
    }
    throw new Error('Backend health check failed. Verify backend is running and reachable.')
  } finally {
    clearTimeout(timeoutId)
  }
}

function toAbsoluteUrl(value) {
  if (!value) return ''
  if (/^https?:\/\//.test(value)) return value
  if (!value.startsWith('/')) return `${API_ORIGIN}/${value}`
  return `${API_ORIGIN}${value}`
}

export {
  API_BASE_URL,
  API_ORIGIN,
  apiRequest,
  pingBackend,
  toAbsoluteUrl,
}
