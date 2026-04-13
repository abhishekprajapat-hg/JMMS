import { useCallback, useEffect, useState } from 'react'
import { apiRequest } from '../api'
import { PortalContext } from './portalContextCore'

const USER_TOKEN_KEY = 'punyanidhi_devotee_token'
const NOTICE_AUTO_DISMISS_MS = 4500

function normalizeUserPayload(payload) {
  return {
    account: payload?.account || null,
    family: payload?.family || payload?.summary?.family || null,
    summary: payload?.summary || null,
    poojaSlots: payload?.poojaSlots || [],
    paymentGateways: payload?.paymentGateways || [],
    transactionTypes: payload?.transactionTypes || [],
    fundCategories: payload?.fundCategories || [],
    paymentPortal: payload?.paymentPortal || {},
    mandirProfile: payload?.mandirProfile || {},
    mandirId: payload?.mandirId || payload?.account?.activeMandirId || '',
  }
}

export function PortalProvider({ children }) {
  const [working, setWorking] = useState(false)
  const [notice, setNotice] = useState({ type: '', text: '' })
  const [mandirs, setMandirs] = useState([])
  const [selectedMandirId, setSelectedMandirId] = useState('')
  const [sessionToken, setSessionToken] = useState(() => window.localStorage.getItem(USER_TOKEN_KEY) || '')
  const [userData, setUserData] = useState(null)

  function showNotice(type, text) {
    setNotice({ type, text })
  }

  function clearNotice() {
    setNotice({ type: '', text: '' })
  }

  async function loadMandirs() {
    try {
      const response = await apiRequest('/public/mandirs')
      const list = response.mandirs || []
      setMandirs(list)
      setSelectedMandirId(list[0]?.id || '')
      return list
    } catch (error) {
      showNotice('error', error.message)
      return []
    }
  }

  async function refreshUserData(token = sessionToken, { silent = false } = {}) {
    if (!token) return null
    try {
      const response = await apiRequest('/user/me', { token })
      const normalized = normalizeUserPayload(response)
      setUserData(normalized)
      return normalized
    } catch (error) {
      window.localStorage.removeItem(USER_TOKEN_KEY)
      setSessionToken('')
      setUserData(null)
      if (!silent) {
        showNotice('error', error.message)
      }
      return null
    }
  }

  async function signIn({ identifier, password }) {
    setWorking(true)
    try {
      const response = await apiRequest('/user/login', {
        method: 'POST',
        body: {
          identifier,
          password,
        },
      })
      const token = response.token
      window.localStorage.setItem(USER_TOKEN_KEY, token)
      setSessionToken(token)
      const normalized = normalizeUserPayload(response)
      setUserData(normalized)
      showNotice('success', 'Signed in successfully.')
      return normalized
    } catch (error) {
      showNotice('error', error.message)
      return null
    } finally {
      setWorking(false)
    }
  }

  async function signUp({ fullName, gotra, whatsapp, address, email, password }) {
    setWorking(true)
    try {
      const response = await apiRequest('/user/register', {
        method: 'POST',
        body: {
          fullName,
          gotra,
          whatsapp,
          address,
          email,
          password,
        },
      })
      const token = response.token
      window.localStorage.setItem(USER_TOKEN_KEY, token)
      setSessionToken(token)
      const normalized = normalizeUserPayload(response)
      setUserData(normalized)
      showNotice('success', 'Account created and signed in.')
      return normalized
    } catch (error) {
      showNotice('error', error.message)
      return null
    } finally {
      setWorking(false)
    }
  }

  function logout({ withNotice = true } = {}) {
    window.localStorage.removeItem(USER_TOKEN_KEY)
    setSessionToken('')
    setUserData(null)
    if (withNotice) {
      showNotice('success', 'You have been logged out.')
    }
  }

  async function createBooking({ date, slot, notes }) {
    if (!sessionToken) return null
    setWorking(true)
    try {
      const response = await apiRequest('/user/bookings', {
        method: 'POST',
        token: sessionToken,
        body: { date, slot, notes },
      })
      await refreshUserData(sessionToken, { silent: true })
      showNotice('success', `Booking ${response.booking.id} created.`)
      return response
    } catch (error) {
      showNotice('error', error.message)
      return null
    } finally {
      setWorking(false)
    }
  }

  const fetchBookingAvailability = useCallback(async (date, { silent = false } = {}) => {
    if (!sessionToken) return null
    const normalizedDate = String(date || '').trim()
    if (!normalizedDate) return null

    try {
      return await apiRequest(`/user/bookings/availability?date=${encodeURIComponent(normalizedDate)}`, {
        token: sessionToken,
      })
    } catch (error) {
      if (!silent) {
        setNotice({ type: 'error', text: error.message })
      }
      return null
    }
  }, [sessionToken])

  async function createPaymentIntent({
    linkedTransactionId,
    amount,
    gateway,
    note,
    transactionType,
    fundCategory,
  }) {
    if (!sessionToken) return null
    setWorking(true)
    try {
      const response = await apiRequest('/user/payments/intents', {
        method: 'POST',
        token: sessionToken,
        body: {
          linkedTransactionId,
          amount: Number(amount),
          gateway,
          note,
          transactionType,
          fundCategory,
        },
      })
      await refreshUserData(sessionToken, { silent: true })
      showNotice('success', `Payment intent ${response.paymentIntent.id} created.`)
      return response
    } catch (error) {
      showNotice('error', error.message)
      return null
    } finally {
      setWorking(false)
    }
  }

  async function submitPaymentProof({ paymentId, payerUtr, payerName }) {
    if (!sessionToken) return null
    setWorking(true)
    try {
      const response = await apiRequest(`/user/payments/${paymentId}/proof`, {
        method: 'POST',
        token: sessionToken,
        body: {
          payerUtr,
          payerName,
        },
      })
      await refreshUserData(sessionToken, { silent: true })
      showNotice('success', `Proof submitted for ${response.paymentIntent.id}.`)
      return response
    } catch (error) {
      showNotice('error', error.message)
      return null
    } finally {
      setWorking(false)
    }
  }

  useEffect(() => {
    loadMandirs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!sessionToken) {
      setUserData(null)
      return
    }
    refreshUserData(sessionToken, { silent: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionToken])

  useEffect(() => {
    if (!notice.text) return undefined
    const timeoutId = window.setTimeout(() => {
      setNotice({ type: '', text: '' })
    }, NOTICE_AUTO_DISMISS_MS)
    return () => window.clearTimeout(timeoutId)
  }, [notice])

  return (
    <PortalContext.Provider
      value={{
        working,
        notice,
        clearNotice,
        showNotice,
        mandirs,
        selectedMandirId,
        setSelectedMandirId,
        loadMandirs,
        sessionToken,
        userData,
        isAuthenticated: Boolean(sessionToken),
        signIn,
        signUp,
        logout,
        refreshUserData,
        createBooking,
        fetchBookingAvailability,
        createPaymentIntent,
        submitPaymentProof,
      }}
    >
      {children}
    </PortalContext.Provider>
  )
}
