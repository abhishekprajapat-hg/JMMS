import AsyncStorage from '@react-native-async-storage/async-storage'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { apiRequest, toAbsoluteUrl } from '../api/client'
import { pickByLanguage } from '../utils/i18n'

const AppContext = createContext(null)

const STORAGE_KEYS = {
  sessionToken: 'jmms_mobile_devotee_token_v1',
  darkMode: 'jmms_mobile_dark_mode_v1',
  userPrefs: 'jmms_mobile_user_prefs_v1',
  language: 'jmms_mobile_language_v1',
  homeData: 'jmms_mobile_home_cache_v1',
  library: 'jmms_mobile_library_cache_v1',
}

const CACHE_TTL_MS = {
  homeData: 5 * 60 * 1000,
  library: 15 * 60 * 1000,
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

const EMPTY_LIBRARY_CACHE = {
  ebook: [],
  video: [],
}

async function readStringStorage(key, fallbackValue = '') {
  try {
    const value = await AsyncStorage.getItem(key)
    return value ?? fallbackValue
  } catch {
    return fallbackValue
  }
}

async function readJsonStorage(key, fallbackValue) {
  try {
    const rawValue = await AsyncStorage.getItem(key)
    if (!rawValue) return fallbackValue
    const parsed = JSON.parse(rawValue)
    return parsed ?? fallbackValue
  } catch {
    return fallbackValue
  }
}

async function writeJsonStorage(key, value) {
  try {
    if (value === null || value === undefined) {
      await AsyncStorage.removeItem(key)
      return
    }
    await AsyncStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore mobile storage failures.
  }
}

async function readTimedCache(key, maxAgeMs, fallbackValue) {
  const stored = await readJsonStorage(key, null)
  const timestamp = Number(stored?.timestamp || 0)

  if (!stored || !timestamp || (maxAgeMs > 0 && Date.now() - timestamp > maxAgeMs)) {
    try {
      await AsyncStorage.removeItem(key)
    } catch {
      // Ignore stale cache cleanup failures.
    }
    return fallbackValue
  }

  return stored.value ?? fallbackValue
}

async function writeTimedCache(key, value) {
  await writeJsonStorage(
    key,
    value === null || value === undefined
      ? null
      : {
          timestamp: Date.now(),
          value,
        },
  )
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

function normalizeLibraryCache(value) {
  return {
    ebook: Array.isArray(value?.ebook) ? value.ebook : [],
    video: Array.isArray(value?.video) ? value.video : [],
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

  const shortMatch = value.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/i)
  if (shortMatch?.[1]) return shortMatch[1]

  const longMatch = value.match(/[?&]v=([A-Za-z0-9_-]{6,})/i)
  if (longMatch?.[1]) return longMatch[1]

  const embedMatch = value.match(/\/embed\/([A-Za-z0-9_-]{6,})/i)
  return embedMatch?.[1] || ''
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
  const [ready, setReady] = useState(false)
  const [sessionToken, setSessionToken] = useState('')
  const [language, setLanguage] = useState('en')
  const [userData, setUserData] = useState(null)
  const [working, setWorking] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [userPrefs, setUserPrefs] = useState({})
  const [homeData, setHomeData] = useState(null)
  const [homeLoading, setHomeLoading] = useState(false)
  const [homeError, setHomeError] = useState('')
  const [libraryCache, setLibraryCache] = useState(EMPTY_LIBRARY_CACHE)
  const libraryCacheRef = useRef(EMPTY_LIBRARY_CACHE)

  const isAuthenticated = Boolean(sessionToken)

  useEffect(() => {
    let active = true

    async function bootstrap() {
      const [
        storedToken,
        storedLanguage,
        storedDarkMode,
        storedUserPrefs,
        storedHomeData,
        storedLibraryCache,
      ] = await Promise.all([
        readStringStorage(STORAGE_KEYS.sessionToken, ''),
        readStringStorage(STORAGE_KEYS.language, 'en'),
        readStringStorage(STORAGE_KEYS.darkMode, 'false'),
        readJsonStorage(STORAGE_KEYS.userPrefs, {}),
        readTimedCache(STORAGE_KEYS.homeData, CACHE_TTL_MS.homeData, null),
        readTimedCache(STORAGE_KEYS.library, CACHE_TTL_MS.library, EMPTY_LIBRARY_CACHE),
      ])

      if (!active) return

      const nextLibraryCache = normalizeLibraryCache(storedLibraryCache)

      setSessionToken(storedToken)
      setLanguage(storedLanguage === 'hi' ? 'hi' : 'en')
      setDarkMode(storedDarkMode === 'true')
      setUserPrefs(storedUserPrefs || {})
      setHomeData(storedHomeData)
      setLibraryCache(nextLibraryCache)
      libraryCacheRef.current = nextLibraryCache
      setReady(true)
    }

    bootstrap()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    libraryCacheRef.current = libraryCache
  }, [libraryCache])

  useEffect(() => {
    if (!ready) return
    void (sessionToken
      ? AsyncStorage.setItem(STORAGE_KEYS.sessionToken, sessionToken)
      : AsyncStorage.removeItem(STORAGE_KEYS.sessionToken))
  }, [ready, sessionToken])

  useEffect(() => {
    if (!ready) return
    void AsyncStorage.setItem(STORAGE_KEYS.language, language)
  }, [language, ready])

  useEffect(() => {
    if (!ready) return
    void AsyncStorage.setItem(STORAGE_KEYS.darkMode, String(darkMode))
  }, [darkMode, ready])

  useEffect(() => {
    if (!ready) return
    void writeJsonStorage(STORAGE_KEYS.userPrefs, userPrefs)
  }, [ready, userPrefs])

  useEffect(() => {
    if (!ready) return
    void writeTimedCache(STORAGE_KEYS.homeData, homeData)
  }, [homeData, ready])

  useEffect(() => {
    if (!ready) return
    void writeTimedCache(STORAGE_KEYS.library, libraryCache)
  }, [libraryCache, ready])

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
      .sort((left, right) => String(right.date || '').localeCompare(String(left.date || '')))
  }, [userData])

  const totalDonations = useMemo(() => {
    const backendValue = Number(userData?.summary?.stats?.lifetimeContributions)
    if (Number.isFinite(backendValue)) return backendValue

    return donations
      .filter((item) => item.status === 'Paid')
      .reduce((sum, item) => sum + Number(item.amount || 0), 0)
  }, [donations, userData])

  const paymentGateways = userData?.paymentGateways?.length ? userData.paymentGateways : DEFAULT_PAYMENT_GATEWAYS
  const fundCategories = userData?.fundCategories?.length ? userData.fundCategories : DEFAULT_FUND_CATEGORIES
  const paymentPortal = userData?.paymentPortal || {}
  const mandirProfile = userData?.mandirProfile || homeData?.mandirProfile || {}
  const pendingPaymentIntents = userData?.summary?.paymentIntents || []

  function toggleDarkMode() {
    setDarkMode((previous) => !previous)
  }

  function toggleLanguage() {
    setLanguage((previous) => (previous === 'hi' ? 'en' : 'hi'))
  }

  const loadHomeData = useCallback(
    async (options = {}) => {
      const force = options?.force === true

      if (!force && homeData) {
        return homeData
      }

      if (!force) {
        const cachedHomeData = await readTimedCache(STORAGE_KEYS.homeData, CACHE_TTL_MS.homeData, null)
        if (cachedHomeData) {
          setHomeData(cachedHomeData)
          setHomeError('')
          return cachedHomeData
        }
      }

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
    },
    [homeData],
  )

  const refreshUserData = useCallback(
    async (token = sessionToken, { silent = false } = {}) => {
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
        await AsyncStorage.removeItem(STORAGE_KEYS.sessionToken).catch(() => {})
        setSessionToken('')
        setUserData(null)

        if (!silent) {
          setHomeError(error.message)
        }

        return null
      }
    },
    [sessionToken],
  )

  const fetchLibrary = useCallback(async (type, { force = false } = {}) => {
    const normalizedType = type === 'video' ? 'video' : 'ebook'

    if (!force) {
      const cachedItems = libraryCacheRef.current[normalizedType]
      if (cachedItems?.length) return cachedItems

      const cachedLibrary = normalizeLibraryCache(
        await readTimedCache(STORAGE_KEYS.library, CACHE_TTL_MS.library, EMPTY_LIBRARY_CACHE),
      )

      if (cachedLibrary[normalizedType]?.length) {
        setLibraryCache(cachedLibrary)
        libraryCacheRef.current = cachedLibrary
        return cachedLibrary[normalizedType]
      }
    }

    try {
      const response = await apiRequest(`/public/library?type=${normalizedType}`)
      const items = Array.isArray(response.items) ? response.items : []
      const mapped = normalizedType === 'video'
        ? items.map(mapVideoItem)
        : items.map((item) => mapLibraryItem(item, normalizedType))

      setLibraryCache((previous) => {
        const nextValue = {
          ...previous,
          [normalizedType]: mapped,
        }
        libraryCacheRef.current = nextValue
        return nextValue
      })

      return mapped
    } catch {
      return []
    }
  }, [])

  useEffect(() => {
    if (!ready) return
    void loadHomeData()
  }, [loadHomeData, ready])

  useEffect(() => {
    if (!ready) return

    if (!sessionToken) {
      setUserData(null)
      return
    }

    void refreshUserData(sessionToken, { silent: true })
  }, [ready, refreshUserData, sessionToken])

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
      const normalized = normalizeUserPayload(response)

      setSessionToken(token)
      setUserData(normalized)

      return {
        ok: true,
        message: pickByLanguage(language, {
          en: 'Login successful.',
          hi: 'Login successful.',
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
      const normalized = normalizeUserPayload(response)

      setSessionToken(token)
      setUserData(normalized)

      return {
        ok: true,
        message: pickByLanguage(language, {
          en: 'Account created successfully.',
          hi: 'Account created successfully.',
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
          hi: 'Please enter a valid email address.',
        }),
      }
    }

    return {
      ok: false,
      message: pickByLanguage(language, {
        en: 'Password reset API is not available yet. Please contact mandir support.',
        hi: 'Password reset API is not available yet. Please contact mandir support.',
      }),
    }
  }

  async function addDonation(donationInput) {
    if (!sessionToken) {
      return {
        ok: false,
        message: pickByLanguage(language, {
          en: 'Please login before making a donation.',
          hi: 'Please login before making a donation.',
        }),
      }
    }

    const selectedFundCategory = fundCategories.includes(donationInput.purpose)
      ? donationInput.purpose
      : fundCategories.find((item) => item === 'General Fund') || fundCategories[0] || 'General Fund'

    const prefersUpi = String(donationInput.paymentMethod || '').toLowerCase().includes('upi')
    const upiGateway = paymentGateways.find((gateway) => /upi/i.test(gateway))
    const bankGateway = paymentGateways.find((gateway) => /bank/i.test(gateway))
    const gateway = prefersUpi
      ? upiGateway || paymentGateways[0] || DEFAULT_PAYMENT_GATEWAYS[0]
      : bankGateway || paymentGateways[0] || DEFAULT_PAYMENT_GATEWAYS[1]

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
          hi: 'Please login before submitting payment proof.',
        }),
      }
    }

    if (!String(paymentId || '').trim()) {
      return {
        ok: false,
        message: pickByLanguage(language, {
          en: 'Missing payment intent ID for proof submission.',
          hi: 'Missing payment intent ID for proof submission.',
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
          hi: 'Please login to save books.',
        }),
      }
    }

    let nextMessage = 'Book saved to profile.'

    setUserPrefs((previousPrefs) => {
      const currentPrefs = previousPrefs[currentUser.id] || {}
      const currentSavedIds = Array.isArray(currentPrefs.savedEbookIds) ? currentPrefs.savedEbookIds : []
      const alreadySaved = currentSavedIds.includes(bookId)
      const nextSavedIds = alreadySaved
        ? currentSavedIds.filter((id) => id !== bookId)
        : [...currentSavedIds, bookId]

      nextMessage = alreadySaved ? 'Book removed from saved list.' : 'Book saved to profile.'

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

  const value = {
    ready,
    currentUser,
    userData,
    isAuthenticated,
    donations,
    userDonations: donations,
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

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within AppProvider.')
  }

  return context
}
