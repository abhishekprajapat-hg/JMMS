/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { apiRequest, toAbsoluteUrl } from '../api'
import { pickByLanguage } from '../utils/i18n'

const AppContext = createContext(null)

const STORAGE_KEYS = {
  sessionToken: 'jmms_devotee_token_v3',
  darkMode: 'jmms_dark_mode_v3',
  userPrefs: 'jmms_user_prefs_v3',
  language: 'jmms_language_v1',
}

const DEFAULT_PAYMENT_GATEWAYS = [
  'Direct UPI (No Commission)',
  'Direct Bank Transfer (No Commission)',
]

const DEFAULT_FUND_CATEGORIES = [
  'Mandir Nirman',
  'Shanti Dhara',
  'Jiv Daya',
  'Aahar Daan',
  'General Fund',
]

function readJsonStorage(key, fallbackValue) {
  try {
    const rawValue = window.localStorage.getItem(key)
    if (!rawValue) return fallbackValue
    const parsed = JSON.parse(rawValue)
    return parsed ?? fallbackValue
  } catch {
    return fallbackValue
  }
}

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

function mapLibraryItem(item, type) {
  const tags = Array.isArray(item.tags) ? item.tags : []
  return {
    id: item.id,
    type,
    title: item.title || 'Untitled',
    author: item.createdBy || 'Jain Mandir Library',
    description: item.description || '',
    category: tags[0] || (type === 'video' ? 'Pravachan' : 'Scripture'),
    coverUrl: toAbsoluteUrl(item.thumbnailUrl),
    thumbnailUrl: toAbsoluteUrl(item.thumbnailUrl),
    readUrl: item.url || '',
    downloadUrl: item.url || '',
    url: item.url || '',
  }
}

function extractYoutubeId(url) {
  const value = String(url || '').trim()
  if (!value) return ''
  try {
    const parsed = new URL(value)
    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.replace('/', '')
    }
    if (parsed.hostname.includes('youtube.com')) {
      return parsed.searchParams.get('v') || ''
    }
    return ''
  } catch {
    return ''
  }
}

function mapVideoItem(item) {
  return {
    ...mapLibraryItem(item, 'video'),
    youtubeId: extractYoutubeId(item.url),
  }
}

function mapDonationItem(transaction) {
  const amount = Number(transaction.amount || 0)
  const status = transaction.status || '-'
  return {
    id: transaction.id,
    amount,
    purpose: transaction.fundCategory || transaction.type || 'General Fund',
    paymentMethod: status,
    date: transaction.paidAt || transaction.createdAt || '',
    status,
    type: transaction.type || '',
    fundCategory: transaction.fundCategory || '',
  }
}

export function AppProvider({ children }) {
  const [sessionToken, setSessionToken] = useState(() => window.localStorage.getItem(STORAGE_KEYS.sessionToken) || '')
  const [language, setLanguage] = useState(() => (window.localStorage.getItem(STORAGE_KEYS.language) === 'hi' ? 'hi' : 'en'))
  const [userData, setUserData] = useState(null)
  const [working, setWorking] = useState(false)
  const [darkMode, setDarkMode] = useState(() => {
    const stored = window.localStorage.getItem(STORAGE_KEYS.darkMode)
    return stored === 'true'
  })
  const [userPrefs, setUserPrefs] = useState(() => readJsonStorage(STORAGE_KEYS.userPrefs, {}))
  const [homeData, setHomeData] = useState(null)
  const [homeLoading, setHomeLoading] = useState(false)
  const [homeError, setHomeError] = useState('')
  const [libraryCache, setLibraryCache] = useState({
    ebook: [],
    video: [],
  })
  const libraryCacheRef = useRef(libraryCache)

  const isAuthenticated = Boolean(sessionToken)

  const currentUser = useMemo(() => {
    if (!userData?.account) return null
    const account = userData.account
    const prefs = userPrefs[account.id] || {}
    return {
      id: account.id,
      name: account.fullName || '',
      email: account.email || '',
      phone: account.whatsapp || '',
      familyId: account.familyId || '',
      mandirId: userData.mandirId || account.activeMandirId || '',
      savedEbookIds: Array.isArray(prefs.savedEbookIds) ? prefs.savedEbookIds : [],
      watchHistory: Array.isArray(prefs.watchHistory) ? prefs.watchHistory : [],
    }
  }, [userData, userPrefs])

  const donations = useMemo(() => {
    const source = userData?.summary?.donations || []
    return source
      .map(mapDonationItem)
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
  }, [userData])

  const userDonations = donations

  const totalDonations = useMemo(() => {
    const backendValue = Number(userData?.summary?.stats?.lifetimeContributions)
    if (Number.isFinite(backendValue)) return backendValue
    return userDonations
      .filter((item) => item.status === 'Paid')
      .reduce((sum, item) => sum + Number(item.amount || 0), 0)
  }, [userData, userDonations])

  const paymentGateways = userData?.paymentGateways?.length ? userData.paymentGateways : DEFAULT_PAYMENT_GATEWAYS
  const fundCategories = userData?.fundCategories?.length ? userData.fundCategories : DEFAULT_FUND_CATEGORIES
  const paymentPortal = userData?.paymentPortal || {}
  const mandirProfile = userData?.mandirProfile || homeData?.mandirProfile || {}
  const pendingPaymentIntents = userData?.summary?.paymentIntents || []

  function applyThemeToDocument(isDark) {
    if (typeof document === 'undefined') return
    const themeValue = isDark ? 'dark' : 'light'
    document.documentElement.classList.toggle('dark', isDark)
    document.documentElement.setAttribute('data-theme', themeValue)
    document.body.classList.toggle('dark', isDark)
    document.body.setAttribute('data-theme', themeValue)
    const rootElement = document.getElementById('root')
    if (rootElement) {
      rootElement.classList.toggle('dark', isDark)
      rootElement.setAttribute('data-theme', themeValue)
    }
  }

  useEffect(() => {
    if (sessionToken) {
      window.localStorage.setItem(STORAGE_KEYS.sessionToken, sessionToken)
    } else {
      window.localStorage.removeItem(STORAGE_KEYS.sessionToken)
    }
  }, [sessionToken])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.darkMode, String(darkMode))
    applyThemeToDocument(darkMode)
  }, [darkMode])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.language, language)
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language
    }
  }, [language])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.userPrefs, JSON.stringify(userPrefs))
  }, [userPrefs])

  useEffect(() => {
    libraryCacheRef.current = libraryCache
  }, [libraryCache])

  function toggleDarkMode() {
    setDarkMode((previous) => {
      const nextValue = !previous
      applyThemeToDocument(nextValue)
      return nextValue
    })
  }

  function toggleLanguage() {
    setLanguage((previous) => (previous === 'hi' ? 'en' : 'hi'))
  }

  const loadHomeData = useCallback(async () => {
    setHomeLoading(true)
    try {
      const response = await apiRequest('/public/home')
      setHomeData(response)
      setHomeError('')
      return response
    } catch (error) {
      setHomeError(error.message)
      return null
    } finally {
      setHomeLoading(false)
    }
  }, [])

  const refreshUserData = useCallback(async (token = sessionToken, { silent = false } = {}) => {
    if (!token) {
      setUserData(null)
      return null
    }
    try {
      const response = await apiRequest('/user/me', { token })
      const normalized = normalizeUserPayload(response)
      setUserData(normalized)
      return normalized
    } catch (error) {
      window.localStorage.removeItem(STORAGE_KEYS.sessionToken)
      setSessionToken('')
      setUserData(null)
      if (!silent) {
        setHomeError(error.message)
      }
      return null
    }
  }, [sessionToken])

  const fetchLibrary = useCallback(async (type, { force = false } = {}) => {
    const normalizedType = type === 'video' ? 'video' : 'ebook'
    if (!force) {
      const cachedItems = libraryCacheRef.current[normalizedType]
      if (cachedItems?.length) return cachedItems
    }

    try {
      const response = await apiRequest(`/public/library?type=${normalizedType}`)
      const items = Array.isArray(response.items) ? response.items : []
      const mapped = normalizedType === 'video'
        ? items.map(mapVideoItem)
        : items.map((item) => mapLibraryItem(item, normalizedType))
      setLibraryCache((previous) => ({
        ...previous,
        [normalizedType]: mapped,
      }))
      return mapped
    } catch {
      return []
    }
  }, [])

  useEffect(() => {
    loadHomeData()
  }, [loadHomeData])

  useEffect(() => {
    if (!sessionToken) {
      setUserData(null)
      return
    }
    refreshUserData(sessionToken, { silent: true })
  }, [sessionToken, refreshUserData])

  async function login({ identifier, password }) {
    setWorking(true)
    try {
      const response = await apiRequest('/user/login', {
        method: 'POST',
        body: {
          identifier,
          password,
        },
      })
      const token = response.token || ''
      setSessionToken(token)
      const normalized = normalizeUserPayload(response)
      setUserData(normalized)
      return {
        ok: true,
        message: pickByLanguage(language, {
          en: 'Login successful.',
          hi: 'लॉगिन सफल रहा।',
        }),
      }
    } catch (error) {
      return { ok: false, message: error.message }
    } finally {
      setWorking(false)
    }
  }

  async function signup({ fullName, gotra, whatsapp, address, email, password }) {
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
      const token = response.token || ''
      setSessionToken(token)
      const normalized = normalizeUserPayload(response)
      setUserData(normalized)
      return {
        ok: true,
        message: pickByLanguage(language, {
          en: 'Account created successfully.',
          hi: 'खाता सफलतापूर्वक बन गया।',
        }),
      }
    } catch (error) {
      return { ok: false, message: error.message }
    } finally {
      setWorking(false)
    }
  }

  function logout() {
    setSessionToken('')
    setUserData(null)
  }

  function requestPasswordReset(email) {
    if (!String(email || '').trim()) {
      return {
        ok: false,
        message: pickByLanguage(language, {
          en: 'Please enter a valid email address.',
          hi: 'कृपया सही ईमेल पता दर्ज करें।',
        }),
      }
    }
    return {
      ok: false,
      message: pickByLanguage(language, {
        en: 'Password reset API is not available yet. Please contact mandir support.',
        hi: 'पासवर्ड रीसेट API अभी उपलब्ध नहीं है। कृपया मंदिर सहायता से संपर्क करें।',
      }),
    }
  }

  async function addDonation(donationInput) {
    if (!sessionToken) {
      return {
        ok: false,
        message: pickByLanguage(language, {
          en: 'Please login before making a donation.',
          hi: 'दान करने से पहले कृपया लॉगिन करें।',
        }),
      }
    }

    const selectedFundCategory = fundCategories.includes(donationInput.purpose)
      ? donationInput.purpose
      : (fundCategories.find((item) => item === 'General Fund') || fundCategories[0] || 'General Fund')

    const prefersUpi = String(donationInput.paymentMethod || '').toLowerCase().includes('upi')
    const upiGateway = paymentGateways.find((gateway) => /upi/i.test(gateway))
    const bankGateway = paymentGateways.find((gateway) => /bank/i.test(gateway))
    const gateway = prefersUpi
      ? (upiGateway || paymentGateways[0] || DEFAULT_PAYMENT_GATEWAYS[0])
      : (bankGateway || paymentGateways[0] || DEFAULT_PAYMENT_GATEWAYS[1])

    setWorking(true)
    try {
      const response = await apiRequest('/user/payments/intents', {
        method: 'POST',
        token: sessionToken,
        body: {
          amount: Number(donationInput.amount),
          gateway,
          note: donationInput.purpose,
          transactionType: 'Bhent',
          fundCategory: selectedFundCategory,
        },
      })
      await refreshUserData(sessionToken, { silent: true })
      const paymentIntent = response.paymentIntent || {}
      return {
        ok: true,
        donation: {
          id: paymentIntent.id,
          amount: paymentIntent.amount,
          purpose: selectedFundCategory,
          paymentMethod: gateway,
          date: paymentIntent.initiatedAt || new Date().toISOString(),
          status: paymentIntent.status || 'Pending',
          instructions: {
            preferredGateway: response.preferredGateway || '',
            upiLink: response.upiLink || '',
            upiQrDataUrl: response.upiQrDataUrl || '',
            paymentLink: response.paymentLink || '',
            bankTransfer: response.bankTransfer || null,
          },
        },
      }
    } catch (error) {
      return {
        ok: false,
        message: error.message,
      }
    } finally {
      setWorking(false)
    }
  }

  async function submitDonationProof({ paymentId, payerUtr, payerName }) {
    if (!sessionToken) {
      return {
        ok: false,
        message: pickByLanguage(language, {
          en: 'Please login before submitting payment proof.',
          hi: 'पेमेंट प्रमाण जमा करने से पहले कृपया लॉगिन करें।',
        }),
      }
    }

    if (!String(paymentId || '').trim()) {
      return {
        ok: false,
        message: pickByLanguage(language, {
          en: 'Missing payment intent ID for proof submission.',
          hi: 'प्रमाण जमा करने के लिए पेमेंट इंटेंट ID नहीं मिली।',
        }),
      }
    }

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
      return {
        ok: true,
        paymentIntent: response.paymentIntent || null,
      }
    } catch (error) {
      return {
        ok: false,
        message: error.message,
      }
    } finally {
      setWorking(false)
    }
  }

  function toggleSavedEbook(bookId) {
    if (!currentUser?.id) {
      return {
        ok: false,
        message: pickByLanguage(language, {
          en: 'Please login to save books.',
          hi: 'किताबें सेव करने के लिए कृपया लॉगिन करें।',
        }),
      }
    }

    let nextMessage = pickByLanguage(language, {
      en: 'Book saved to profile.',
      hi: 'किताब प्रोफाइल में सेव हो गई।',
    })
    setUserPrefs((previousPrefs) => {
      const currentPrefs = previousPrefs[currentUser.id] || {}
      const currentSavedIds = Array.isArray(currentPrefs.savedEbookIds) ? currentPrefs.savedEbookIds : []
      const alreadySaved = currentSavedIds.includes(bookId)
      const nextSavedIds = alreadySaved
        ? currentSavedIds.filter((id) => id !== bookId)
        : [...currentSavedIds, bookId]
      nextMessage = alreadySaved
        ? pickByLanguage(language, {
          en: 'Book removed from saved list.',
          hi: 'किताब सेव सूची से हटा दी गई।',
        })
        : pickByLanguage(language, {
          en: 'Book saved to profile.',
          hi: 'किताब प्रोफाइल में सेव हो गई।',
        })
      return {
        ...previousPrefs,
        [currentUser.id]: {
          ...currentPrefs,
          savedEbookIds: nextSavedIds,
          watchHistory: Array.isArray(currentPrefs.watchHistory) ? currentPrefs.watchHistory : [],
        },
      }
    })

    return { ok: true, message: nextMessage }
  }

  function addWatchHistory(video) {
    if (!currentUser?.id) return
    setUserPrefs((previousPrefs) => {
      const currentPrefs = previousPrefs[currentUser.id] || {}
      const watchHistory = Array.isArray(currentPrefs.watchHistory) ? currentPrefs.watchHistory : []
      const cleaned = watchHistory.filter((entry) => entry.videoId !== video.id)
      const nextEntry = {
        videoId: video.id,
        title: video.title,
        watchedAt: new Date().toISOString(),
      }
      return {
        ...previousPrefs,
        [currentUser.id]: {
          ...currentPrefs,
          savedEbookIds: Array.isArray(currentPrefs.savedEbookIds) ? currentPrefs.savedEbookIds : [],
          watchHistory: [nextEntry, ...cleaned].slice(0, 25),
        },
      }
    })
  }

  const contextValue = {
    currentUser,
    userData,
    isAuthenticated,
    donations,
    userDonations,
    totalDonations,
    paymentGateways,
    fundCategories,
    paymentPortal,
    pendingPaymentIntents,
    mandirProfile,
    darkMode,
    language,
    working,
    homeData,
    homeLoading,
    homeError,
    toggleDarkMode,
    setLanguage,
    toggleLanguage,
    loadHomeData,
    fetchLibrary,
    login,
    signup,
    logout,
    requestPasswordReset,
    addDonation,
    submitDonationProof,
    toggleSavedEbook,
    addWatchHistory,
    refreshUserData,
  }

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within AppProvider.')
  }
  return context
}
