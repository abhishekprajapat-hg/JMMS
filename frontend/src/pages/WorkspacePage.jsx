import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  EVENT_HALLS,
  EXPENSE_CATEGORIES,
  FUND_CATEGORIES,
  MANDIR_PROFILE,
  MODULES,
  PAYMENT_GATEWAYS,
  PAYMENT_STATUSES,
  POOJA_SLOTS,
  ROLE_CONFIG,
  TRANSACTION_TYPES,
  WHATSAPP_PROVIDERS,
} from '../constants'
import {
  formatCurrency,
  formatDate,
  isDatePastDue,
  toISODate,
  validateIndianWhatsApp,
} from '../utils/validation'
import { translateText } from '../utils/i18n'
import { API_BASE_URL, API_ORIGIN, apiRequest, pingBackend, toAbsoluteUrl } from '../services/api'
import { PaymentsModule } from '../modules/PaymentsModule'
import { PortalModule } from '../modules/PortalModule'
import { ExpensesModule } from '../modules/ExpensesModule'
import { AccountingModule } from '../modules/AccountingModule'
import { EventsModule } from '../modules/EventsModule'
import { ContentModule } from '../modules/ContentModule'
import { StaffModule } from '../modules/StaffModule'
import { LanguageToggle } from '../components/layout/LanguageToggle'
import { AppHeader } from '../components/layout/AppHeader'
import { ModuleSidebar } from '../components/layout/ModuleSidebar'
import { DashboardPage } from './DashboardPage'
import { DirectoryPage } from './DirectoryPage'
import { FinancePage } from './FinancePage'
import { WhatsAppPage } from './WhatsAppPage'
import { InventoryPage } from './InventoryPage'
import { SchedulerPage } from './SchedulerPage'

const TOKEN_STORAGE_KEY = 'jmms_auth_token'
const REFRESH_TOKEN_STORAGE_KEY = 'jmms_refresh_token'
const LANGUAGE_STORAGE_KEY = 'jmms_language'
const DEFAULT_MUNIM_NAME = 'Shri Rakesh Jain'
const NOTICE_AUTO_DISMISS_MS = 4500
const MODULE_ROUTE_MAP = {
  dashboard: '/dashboard',
  directory: '/directory',
  finance: '/finance',
  payments: '/payments',
  portal: '/portal',
  expenses: '/expenses',
  accounting: '/accounting',
  events: '/events',
  content: '/content',
  staff: '/staff',
  whatsapp: '/whatsapp',
  inventory: '/inventory',
  scheduler: '/scheduler',
}

function getModuleFromPathname(pathname) {
  const cleanPath = String(pathname || '/dashboard').split('?')[0].replace(/\/+$/, '') || '/dashboard'
  const found = Object.entries(MODULE_ROUTE_MAP).find(([, path]) => path === cleanPath)
  return found?.[0] || 'dashboard'
}

function getPathForModule(moduleId) {
  return MODULE_ROUTE_MAP[moduleId] || MODULE_ROUTE_MAP.dashboard
}

function shouldShowModule(moduleId, permissions) {
  if (moduleId === 'dashboard') return true
  if (moduleId === 'directory') return permissions.viewDevoteeDirectory
  if (moduleId === 'finance') return permissions.logDonations || permissions.viewFinancialTotals
  if (moduleId === 'payments') return permissions.managePayments || permissions.reconcilePayments
  if (moduleId === 'portal') return permissions.accessDevoteePortal
  if (moduleId === 'expenses') return permissions.manageExpenses || permissions.viewAccounting
  if (moduleId === 'accounting') return permissions.viewAccounting
  if (moduleId === 'events') return permissions.manageEvents || permissions.viewSchedule
  if (moduleId === 'content') return permissions.managePublicContent
  if (moduleId === 'staff') return permissions.manageStaffUsers
  if (moduleId === 'whatsapp') return permissions.manageWhatsApp
  if (moduleId === 'inventory') return permissions.viewInventory || permissions.manageInventory
  if (moduleId === 'scheduler') return permissions.viewSchedule || permissions.manageSchedule
  return false
}

function getInitialReference() {
  return {
    mandirProfile: MANDIR_PROFILE,
    transactionTypes: TRANSACTION_TYPES,
    fundCategories: FUND_CATEGORIES,
    paymentStatuses: PAYMENT_STATUSES,
    poojaSlots: POOJA_SLOTS,
    whatsappProviders: WHATSAPP_PROVIDERS,
    paymentGateways: PAYMENT_GATEWAYS,
    expenseCategories: EXPENSE_CATEGORIES,
    eventHalls: EVENT_HALLS,
    roles: ROLE_CONFIG,
  }
}

function getInitialSummaryReport() {
  return {
    reportDate: '',
    totals: null,
    byFundCategory: [],
  }
}

export function WorkspacePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const routeModule = useMemo(() => getModuleFromPathname(location.pathname), [location.pathname])
  const [authToken, setAuthToken] = useState(() => window.localStorage.getItem(TOKEN_STORAGE_KEY) || '')
  const [refreshToken, setRefreshToken] = useState(() => window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY) || '')
  const [language, setLanguage] = useState(() => {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
    return stored === 'hi' ? 'hi' : 'en'
  })
  const [currentUser, setCurrentUser] = useState(null)
  const [actingMunim, setActingMunim] = useState(DEFAULT_MUNIM_NAME)
  const [trusteeOverride, setTrusteeOverride] = useState(false)
  const [activeModule, setActiveModule] = useState(routeModule)
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false)
  const [notice, setNotice] = useState({ type: '', text: '' })
  const [bootstrapping, setBootstrapping] = useState(Boolean(authToken))
  const [working, setWorking] = useState(false)
  const [backendStatus, setBackendStatus] = useState({
    state: 'checking',
    label: 'Checking backend connection...',
    detail: '',
    checkedAt: '',
  })

  const [systemReference, setSystemReference] = useState(getInitialReference)
  const [trusteeSummary, setTrusteeSummary] = useState(getInitialSummaryReport)
  const [analyticsReport, setAnalyticsReport] = useState({
    reportDate: '',
    byFundCategory: [],
    monthlyTrend: [],
    pledgeAging: [],
    topContributors: [],
  })
  const [dashboardMetrics, setDashboardMetrics] = useState({
    todayPaidTotal: null,
    pendingPledgeAmount: 0,
    overduePledgeCount: 0,
    overdueAssetCount: 0,
    openCheckoutCount: 0,
    upcomingSlots: 0,
  })

  const [families, setFamilies] = useState([])
  const [transactions, setTransactions] = useState([])
  const [assets, setAssets] = useState([])
  const [assetCheckouts, setAssetCheckouts] = useState([])
  const [poojaBookings, setPoojaBookings] = useState([])
  const [cancellationLogs, setCancellationLogs] = useState([])
  const [approvalQueue, setApprovalQueue] = useState([])
  const [whatsAppLogs, setWhatsAppLogs] = useState([])
  const [whatsAppRetryQueue, setWhatsAppRetryQueue] = useState([])
  const [cronLastRunDate, setCronLastRunDate] = useState('')
  const [retrySweepLastRunAt, setRetrySweepLastRunAt] = useState('')
  const [setupStatus, setSetupStatus] = useState({
    initialized: true,
    checked: false,
  })

  const [loginForm, setLoginForm] = useState({
    username: '',
    password: '',
  })
  const [setupForm, setSetupForm] = useState({
    trusteeName: '',
    trusteeUsername: '',
    trusteePassword: '',
    mandirName: MANDIR_PROFILE.name,
    mandirAddress: MANDIR_PROFILE.address,
    mandirPan: MANDIR_PROFILE.pan,
    mandir80G: MANDIR_PROFILE.reg80G,
    mandirTrustNumber: MANDIR_PROFILE.trustNumber,
    mandirLetterhead: MANDIR_PROFILE.letterhead,
  })

  const [familyForm, setFamilyForm] = useState({
    headName: '',
    gotra: '',
    whatsapp: '',
    address: '',
  })
  const [familyCsvImport, setFamilyCsvImport] = useState('')
  const [familySearch, setFamilySearch] = useState('')
  const [selectedFamilyId, setSelectedFamilyId] = useState('')

  const [transactionForm, setTransactionForm] = useState({
    familyId: '',
    type: 'Bhent',
    fundCategory: FUND_CATEGORIES[0],
    status: 'Paid',
    amount: '',
    dueDate: '',
  })
  const [refundForm, setRefundForm] = useState({
    transactionId: '',
    reason: '',
  })
  const [transactionSearch, setTransactionSearch] = useState('')

  const [assetForm, setAssetForm] = useState({
    name: '',
    totalUnits: '',
  })
  const [checkoutForm, setCheckoutForm] = useState({
    assetId: '',
    familyId: '',
    quantity: 1,
    expectedReturnDate: '',
  })

  const [bookingForm, setBookingForm] = useState({
    date: toISODate(),
    slot: POOJA_SLOTS[0],
    familyId: '',
    notes: '',
  })

  const [whatsAppConfig, setWhatsAppConfig] = useState({
    provider: WHATSAPP_PROVIDERS[0],
    apiUrl: '',
    accessToken: '',
    businessNumber: '',
  })

  const textOriginalMapRef = useRef(new WeakMap())
  const placeholderOriginalMapRef = useRef(new WeakMap())
  const titleOriginalMapRef = useRef(new WeakMap())
  const ariaLabelOriginalMapRef = useRef(new WeakMap())
  const applyingLanguageRef = useRef(false)
  const mainPanelRef = useRef(null)

  const permissions = useMemo(() => currentUser?.permissions || {}, [currentUser])
  const canBypassBlocks = currentUser?.role === 'trustee' && trusteeOverride
  const canCancelOrRefund = Boolean(permissions.cancelOrRefund)
  const canManageWhatsApp = Boolean(permissions.manageWhatsApp)
  const canViewReports = Boolean(permissions.viewReports)

  const transactionTypes = systemReference.transactionTypes?.length
    ? systemReference.transactionTypes
    : TRANSACTION_TYPES
  const fundCategories = systemReference.fundCategories?.length
    ? systemReference.fundCategories
    : FUND_CATEGORIES
  const paymentStatuses = systemReference.paymentStatuses?.length
    ? systemReference.paymentStatuses
    : PAYMENT_STATUSES
  const poojaSlots = systemReference.poojaSlots?.length
    ? systemReference.poojaSlots
    : POOJA_SLOTS
  const whatsappProviders = systemReference.whatsappProviders?.length
    ? systemReference.whatsappProviders
    : WHATSAPP_PROVIDERS
  const paymentGateways = systemReference.paymentGateways?.length
    ? systemReference.paymentGateways
    : PAYMENT_GATEWAYS
  const expenseCategories = systemReference.expenseCategories?.length
    ? systemReference.expenseCategories
    : EXPENSE_CATEGORIES
  const eventHalls = systemReference.eventHalls?.length
    ? systemReference.eventHalls
    : EVENT_HALLS

  const visibleModules = useMemo(
    () => MODULES.filter((module) => shouldShowModule(module.id, permissions)),
    [permissions],
  )

  const familyLookup = useMemo(
    () => Object.fromEntries(families.map((family) => [family.familyId, family])),
    [families],
  )

  const filteredFamilies = useMemo(() => {
    const query = familySearch.trim().toLowerCase()
    if (!query) return families

    return families.filter((family) =>
      [family.familyId, family.headName, family.gotra, family.whatsapp, family.address]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    )
  }, [families, familySearch])

  const filteredTransactions = useMemo(() => {
    const query = transactionSearch.trim().toLowerCase()
    if (!query) return transactions

    return transactions.filter((transaction) => {
      const familyName =
        transaction.type === 'Gupt Daan' ? 'Anonymous' : familyLookup[transaction.familyId]?.headName || ''
      return [
        transaction.id,
        familyName,
        transaction.type,
        transaction.fundCategory,
        transaction.status,
        String(transaction.amount),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    })
  }, [transactions, transactionSearch, familyLookup])

  const localMetrics = useMemo(() => {
    const today = toISODate()
    const paidTransactions = transactions.filter((transaction) => transaction.status === 'Paid' && !transaction.cancelled)
    const todayPaidTotal = paidTransactions
      .filter((transaction) => String(transaction.createdAt || '').startsWith(today))
      .reduce((sum, transaction) => sum + transaction.amount, 0)

    const pendingPledges = transactions.filter((transaction) => transaction.status === 'Pledged' && !transaction.cancelled)
    const pendingPledgeAmount = pendingPledges.reduce((sum, transaction) => sum + transaction.amount, 0)
    const overduePledges = pendingPledges.filter((transaction) => transaction.dueDate && transaction.dueDate <= today)

    const openCheckouts = assetCheckouts.filter((checkout) => checkout.status === 'Checked Out')
    const overdueAssets = openCheckouts.filter((checkout) => isDatePastDue(checkout.expectedReturnDate, today))
    const upcomingSlots = poojaBookings.filter((booking) => booking.date >= today).length

    return {
      todayPaidTotal,
      pendingPledgeAmount,
      overduePledges,
      overdueAssets,
      openCheckouts,
      upcomingSlots,
    }
  }, [transactions, assetCheckouts, poojaBookings])

  const selectedFamilyTransactions = useMemo(
    () => transactions.filter((transaction) => transaction.familyId === selectedFamilyId),
    [selectedFamilyId, transactions],
  )

  const selectedFamilyLifetime = selectedFamilyTransactions
    .filter((transaction) => transaction.status === 'Paid' && !transaction.cancelled)
    .reduce((sum, transaction) => sum + transaction.amount, 0)

  const selectedFamilyPendingBoli = selectedFamilyTransactions
    .filter((transaction) => transaction.status === 'Pledged' && !transaction.cancelled)
    .reduce((sum, transaction) => sum + transaction.amount, 0)

  function showNotice(type, text) {
    setNotice({ type, text })
  }

  useEffect(() => {
    if (!notice.text) return undefined
    const timeoutId = window.setTimeout(() => {
      setNotice({ type: '', text: '' })
    }, NOTICE_AUTO_DISMISS_MS)
    return () => window.clearTimeout(timeoutId)
  }, [notice.text, notice.type])

  function showDonationNoticeWithWhatsApp(log, baseMessage) {
    const familyName = String(log?.familyName || '').trim()
    const familyInfo = familyName && familyName !== '-' ? ` Family: ${familyName}.` : ''
    const phone = String(log?.phone || '').trim()
    const phoneInfo = phone && phone !== '-' ? ` WhatsApp target: ${phone}.` : ''
    if (!log?.status || log.status === 'Mock Sent') {
      showNotice('success', `${baseMessage}${familyInfo}${phoneInfo}`)
      return
    }
    if (log.status === 'Sent') {
      showNotice(
        'success',
        `${baseMessage}${familyInfo}${phoneInfo} Meta accepted send request. Delivery confirmation will appear in WhatsApp Logs.`,
      )
      return
    }

    const detail = String(log.detail || '').trim()
    const suffix = detail ? ` (${detail.slice(0, 160)})` : ''
    showNotice('error', `${baseMessage}${familyInfo}${phoneInfo} WhatsApp status: ${log.status}.${suffix}`)
  }

  const applyLanguageToDom = useCallback(() => {
    if (typeof document === 'undefined' || applyingLanguageRef.current) return
    const root = document.getElementById('root')
    if (!root) return

    applyingLanguageRef.current = true
    try {
      const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode(node) {
            if (!node?.nodeValue || !node.nodeValue.trim()) {
              return NodeFilter.FILTER_REJECT
            }

            const parent = node.parentElement
            if (!parent) return NodeFilter.FILTER_REJECT
            if (parent.closest('[data-i18n-skip="true"]')) return NodeFilter.FILTER_REJECT
            if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parent.tagName)) {
              return NodeFilter.FILTER_REJECT
            }

            return NodeFilter.FILTER_ACCEPT
          },
        },
      )

      let currentNode = walker.nextNode()
      while (currentNode) {
        if (!textOriginalMapRef.current.has(currentNode)) {
          textOriginalMapRef.current.set(currentNode, currentNode.nodeValue)
        }
        const originalText = textOriginalMapRef.current.get(currentNode) || ''
        const localizedText = translateText(originalText, language)
        if (currentNode.nodeValue !== localizedText) {
          currentNode.nodeValue = localizedText
        }
        currentNode = walker.nextNode()
      }

      root.querySelectorAll('input[placeholder], textarea[placeholder]').forEach((element) => {
        if (element.closest('[data-i18n-skip="true"]')) return
        if (!placeholderOriginalMapRef.current.has(element)) {
          placeholderOriginalMapRef.current.set(element, element.getAttribute('placeholder') || '')
        }
        const originalPlaceholder = placeholderOriginalMapRef.current.get(element) || ''
        const localizedPlaceholder = translateText(originalPlaceholder, language)
        if ((element.getAttribute('placeholder') || '') !== localizedPlaceholder) {
          element.setAttribute('placeholder', localizedPlaceholder)
        }
      })

      root.querySelectorAll('[title]').forEach((element) => {
        if (element.closest('[data-i18n-skip="true"]')) return
        if (!titleOriginalMapRef.current.has(element)) {
          titleOriginalMapRef.current.set(element, element.getAttribute('title') || '')
        }
        const originalTitle = titleOriginalMapRef.current.get(element) || ''
        const localizedTitle = translateText(originalTitle, language)
        if ((element.getAttribute('title') || '') !== localizedTitle) {
          element.setAttribute('title', localizedTitle)
        }
      })

      root.querySelectorAll('[aria-label]').forEach((element) => {
        if (element.closest('[data-i18n-skip="true"]')) return
        if (!ariaLabelOriginalMapRef.current.has(element)) {
          ariaLabelOriginalMapRef.current.set(element, element.getAttribute('aria-label') || '')
        }
        const originalLabel = ariaLabelOriginalMapRef.current.get(element) || ''
        const localizedLabel = translateText(originalLabel, language)
        if ((element.getAttribute('aria-label') || '') !== localizedLabel) {
          element.setAttribute('aria-label', localizedLabel)
        }
      })
    } finally {
      applyingLanguageRef.current = false
    }
  }, [language])

  function mapTransactions(items) {
    return items.map((transaction) => ({
      ...transaction,
      receiptUrl: toAbsoluteUrl(transaction.receiptPath || transaction.receiptUrl || ''),
    }))
  }

  function parseCsvLine(value) {
    const row = String(value || '')
    const cells = []
    let current = ''
    let inQuotes = false

    for (let index = 0; index < row.length; index += 1) {
      const char = row[index]
      const next = row[index + 1]
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
        cells.push(current)
        current = ''
        continue
      }
      current += char
    }
    cells.push(current)
    return cells
  }

  function csvToRows(csvText) {
    const lines = String(csvText || '')
      .replace(/\r\n/g, '\n')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
    if (lines.length < 2) return []
    const headers = parseCsvLine(lines[0]).map((header) => header.trim())
    return lines.slice(1).map((line) => {
      const values = parseCsvLine(line)
      const output = {}
      headers.forEach((header, index) => {
        output[header] = (values[index] || '').trim()
      })
      return output
    })
  }

  async function downloadCsvReport(path, fileName) {
    if (!authToken) return
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    })
    if (!response.ok) {
      throw new Error(`Failed to export CSV (${response.status}).`)
    }
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  }

  const applySummaryReport = useCallback((summaryResponse) => {
    const ledger = summaryResponse?.byFundCategory || {}
    const byFundCategory = Array.isArray(ledger)
      ? ledger
      : Object.entries(ledger).map(([fund, amount]) => ({ fund, amount }))

    setTrusteeSummary({
      reportDate: summaryResponse?.reportDate || '',
      totals: summaryResponse?.totals || null,
      byFundCategory,
    })
  }, [])

  const applyAnalyticsReport = useCallback((analyticsResponse) => {
    setAnalyticsReport({
      reportDate: analyticsResponse?.reportDate || '',
      byFundCategory: analyticsResponse?.byFundCategory || [],
      monthlyTrend: analyticsResponse?.monthlyTrend || [],
      pledgeAging: analyticsResponse?.pledgeAging || [],
      topContributors: analyticsResponse?.topContributors || [],
    })
  }, [])

  const checkBackendHealth = useCallback(async () => {
    setBackendStatus((current) => ({
      ...current,
      state: 'checking',
      label: 'Checking backend connection...',
    }))

    try {
      const health = await pingBackend()
      if (!health.ok) {
        throw new Error(`Health endpoint responded with status ${health.status}.`)
      }

      setBackendStatus({
        state: 'online',
        label: 'Backend connected',
        detail: `${health.payload?.service || 'jmms-backend'} (${health.payload?.status || 'ok'})`,
        checkedAt: new Date().toISOString(),
      })
    } catch (error) {
      setBackendStatus({
        state: 'offline',
        label: 'Backend unreachable',
        detail: error.message || 'Backend health check failed.',
        checkedAt: new Date().toISOString(),
      })
    }
  }, [])

  const clearSession = useCallback(() => {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY)
    window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
    setAuthToken('')
    setRefreshToken('')
    setCurrentUser(null)
    setFamilies([])
    setTransactions([])
    setAssets([])
    setAssetCheckouts([])
    setPoojaBookings([])
    setCancellationLogs([])
    setApprovalQueue([])
    setWhatsAppLogs([])
    setWhatsAppRetryQueue([])
    setCronLastRunDate('')
    setRetrySweepLastRunAt('')
    setTrusteeSummary(getInitialSummaryReport())
    setAnalyticsReport({
      reportDate: '',
      byFundCategory: [],
      monthlyTrend: [],
      pledgeAging: [],
      topContributors: [],
    })
    setFamilySearch('')
    setFamilyCsvImport('')
    setTransactionSearch('')
    setActiveModule('dashboard')
    setTrusteeOverride(false)
  }, [])

  const fetchBootstrapData = useCallback(async (token, loginUser = null) => {
    setBootstrapping(true)
    try {
      const [referenceRes, meRes] = await Promise.all([
        apiRequest('/system/reference'),
        loginUser ? Promise.resolve({ user: loginUser }) : apiRequest('/auth/me', { token }),
      ])

      setSystemReference((current) => ({
        ...current,
        ...referenceRes,
      }))

      const user = meRes.user
      setCurrentUser(user)
      setSetupStatus({ initialized: true, checked: true })
      setActingMunim(user.fullName || DEFAULT_MUNIM_NAME)

      const [
        metricRes,
        summaryRes,
        analyticsRes,
        familyRes,
        transactionRes,
        assetRes,
        checkoutRes,
        bookingRes,
        cancellationRes,
        approvalsRes,
        waConfigRes,
        waLogRes,
      ] = await Promise.all([
        apiRequest('/dashboard/metrics', { token }),
        user.permissions.viewReports
          ? apiRequest('/dashboard/reports/summary', { token })
          : Promise.resolve(getInitialSummaryReport()),
        user.permissions.viewReports
          ? apiRequest('/dashboard/reports/analytics', { token })
          : Promise.resolve({
              reportDate: '',
              byFundCategory: [],
              monthlyTrend: [],
              pledgeAging: [],
              topContributors: [],
            }),
        apiRequest('/families', { token }),
        apiRequest('/transactions', { token }),
        apiRequest('/inventory/assets', { token }),
        apiRequest('/inventory/assets/checkouts', { token }),
        apiRequest('/scheduler/bookings', { token }),
        user.permissions.cancelOrRefund
          ? apiRequest('/transactions/cancellations/logs', { token })
          : Promise.resolve({ cancellationLogs: [] }),
        user.permissions.approveSensitiveActions ||
        user.permissions.cancelOrRefund ||
        user.permissions.manageDevotees ||
        user.permissions.manageExpenses
          ? apiRequest('/approvals', { token })
          : Promise.resolve({ approvals: [] }),
        user.permissions.manageWhatsApp
          ? apiRequest('/whatsapp/config', { token })
          : Promise.resolve({ whatsappConfig: {} }),
        user.permissions.manageWhatsApp
          ? apiRequest('/whatsapp/logs', { token })
          : Promise.resolve({ logs: [], dueReminderLastRunDate: '', retryQueue: [], whatsAppRetryLastRunAt: '' }),
      ])

      setDashboardMetrics(metricRes.metrics || {})
      applySummaryReport(summaryRes)
      applyAnalyticsReport(analyticsRes)
      setFamilies(familyRes.families || [])
      setTransactions(mapTransactions(transactionRes.transactions || []))
      setAssets(assetRes.assets || [])
      setAssetCheckouts(checkoutRes.checkouts || [])
      setPoojaBookings(bookingRes.bookings || [])
      setCancellationLogs(cancellationRes.cancellationLogs || [])
      setApprovalQueue(approvalsRes.approvals || [])
      setWhatsAppConfig((current) => ({
        ...current,
        ...(waConfigRes.whatsappConfig || {}),
      }))
      setWhatsAppLogs(waLogRes.logs || [])
      setWhatsAppRetryQueue(waLogRes.retryQueue || [])
      setCronLastRunDate(waLogRes.dueReminderLastRunDate || '')
      setRetrySweepLastRunAt(waLogRes.whatsAppRetryLastRunAt || '')
      setBackendStatus({
        state: 'online',
        label: 'Backend connected',
        detail: `Data synced from ${API_ORIGIN}`,
        checkedAt: new Date().toISOString(),
      })
    } catch (error) {
      showNotice('error', error.message)
      setBackendStatus({
        state: 'offline',
        label: 'Backend unreachable',
        detail: error.message,
        checkedAt: new Date().toISOString(),
      })
      clearSession()
    } finally {
      setBootstrapping(false)
    }
  }, [applyAnalyticsReport, applySummaryReport, clearSession])

  const refreshDashboard = useCallback(async () => {
    if (!authToken) return
    const [metricRes, summaryRes, analyticsRes] = await Promise.all([
      apiRequest('/dashboard/metrics', { token: authToken }),
      canViewReports ? apiRequest('/dashboard/reports/summary', { token: authToken }) : Promise.resolve(null),
      canViewReports ? apiRequest('/dashboard/reports/analytics', { token: authToken }) : Promise.resolve(null),
    ])
    setDashboardMetrics(metricRes.metrics || {})
    if (summaryRes) {
      applySummaryReport(summaryRes)
    }
    if (analyticsRes) {
      applyAnalyticsReport(analyticsRes)
    }
  }, [applyAnalyticsReport, applySummaryReport, authToken, canViewReports])

  const refreshTransactions = useCallback(async () => {
    if (!authToken) return
    const response = await apiRequest('/transactions', { token: authToken })
    setTransactions(mapTransactions(response.transactions || []))
  }, [authToken])

  const refreshWhatsApp = useCallback(async () => {
    if (!authToken || !canManageWhatsApp) return

    const [configRes, logRes] = await Promise.all([
      apiRequest('/whatsapp/config', { token: authToken }),
      apiRequest('/whatsapp/logs', { token: authToken }),
    ])

    setWhatsAppConfig((current) => ({
      ...current,
      ...(configRes.whatsappConfig || {}),
    }))
    setWhatsAppLogs(logRes.logs || [])
    setWhatsAppRetryQueue(logRes.retryQueue || [])
    setCronLastRunDate(logRes.dueReminderLastRunDate || '')
    setRetrySweepLastRunAt(logRes.whatsAppRetryLastRunAt || '')
  }, [authToken, canManageWhatsApp])

  const refreshApprovals = useCallback(async () => {
    if (!authToken) return
    try {
      const response = await apiRequest('/approvals', { token: authToken })
      setApprovalQueue(response.approvals || [])
    } catch (error) {
      void error
    }
  }, [authToken])

  useEffect(() => {
    checkBackendHealth()
  }, [checkBackendHealth])

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
    document.documentElement.lang = language === 'hi' ? 'hi' : 'en'
    applyLanguageToDom()

    const root = document.getElementById('root')
    if (!root) return undefined

    const observer = new MutationObserver(() => {
      applyLanguageToDom()
    })
    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
    })

    return () => {
      observer.disconnect()
    }
  }, [applyLanguageToDom, language])

  useEffect(() => {
    if (authToken) {
      fetchBootstrapData(authToken)
      return
    }

    Promise.all([
      apiRequest('/system/reference'),
      apiRequest('/system/setup-status').catch(() => ({ initialized: true })),
    ])
      .then(([referenceResponse, setupResponse]) => {
        setSystemReference((current) => ({
          ...current,
          ...referenceResponse,
        }))
        setSetupStatus({
          initialized: Boolean(setupResponse?.initialized ?? true),
          checked: true,
        })
        setBackendStatus({
          state: 'online',
          label: 'Backend connected',
          detail: `Reference data loaded from ${API_ORIGIN}`,
          checkedAt: new Date().toISOString(),
        })
      })
      .catch((error) => {
        setSetupStatus({
          initialized: true,
          checked: true,
        })
        setBackendStatus({
          state: 'offline',
          label: 'Backend unreachable',
          detail: error.message || 'Using local fallback reference data.',
          checkedAt: new Date().toISOString(),
        })
      })
    setBootstrapping(false)
  }, [authToken, fetchBootstrapData])

  useEffect(() => {
    if (activeModule !== routeModule) {
      setActiveModule(routeModule)
    }
  }, [activeModule, routeModule])

  useEffect(() => {
    if (currentUser && location.pathname === '/login') {
      navigate(MODULE_ROUTE_MAP.dashboard, { replace: true })
    }
  }, [currentUser, location.pathname, navigate])

  useEffect(() => {
    if (bootstrapping || !currentUser) return
    if (!visibleModules.some((module) => module.id === activeModule)) {
      const fallbackModuleId = visibleModules[0]?.id || 'dashboard'
      setActiveModule(fallbackModuleId)
      const fallbackPath = getPathForModule(fallbackModuleId)
      if (location.pathname !== fallbackPath) {
        navigate(fallbackPath, { replace: true })
      }
    }
  }, [activeModule, visibleModules, location.pathname, navigate, bootstrapping, currentUser])

  useEffect(() => {
    setIsMoreMenuOpen(false)
  }, [activeModule])

  useEffect(() => {
    mainPanelRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [activeModule])

  useEffect(() => {
    if (!authToken || !currentUser) return
    if (!(permissions.approveSensitiveActions || permissions.cancelOrRefund || permissions.manageDevotees || permissions.manageExpenses)) return
    refreshApprovals()
  }, [
    authToken,
    currentUser,
    permissions.approveSensitiveActions,
    permissions.cancelOrRefund,
    permissions.manageDevotees,
    permissions.manageExpenses,
    refreshApprovals,
  ])

  useEffect(() => {
    const defaultFamilyId = families[0]?.familyId || ''

    setSelectedFamilyId((current) => {
      if (current && families.some((family) => family.familyId === current)) {
        return current
      }
      return defaultFamilyId
    })

    setTransactionForm((current) => {
      if (current.familyId && families.some((family) => family.familyId === current.familyId)) {
        return current
      }
      return { ...current, familyId: defaultFamilyId }
    })

    setCheckoutForm((current) => {
      if (current.familyId && families.some((family) => family.familyId === current.familyId)) {
        return current
      }
      return { ...current, familyId: defaultFamilyId }
    })

    setBookingForm((current) => {
      if (current.familyId && families.some((family) => family.familyId === current.familyId)) {
        return current
      }
      return { ...current, familyId: defaultFamilyId }
    })
  }, [families])

  useEffect(() => {
    const defaultAssetId = assets[0]?.id || ''
    setCheckoutForm((current) => {
      if (current.assetId && assets.some((asset) => asset.id === current.assetId)) {
        return current
      }
      return { ...current, assetId: defaultAssetId }
    })
  }, [assets])

  useEffect(() => {
    const firstType = transactionTypes[0] || 'Bhent'
    const firstFund = fundCategories[0] || 'Mandir Nirman'
    const firstStatus = paymentStatuses[0] || 'Paid'
    const firstSlot = poojaSlots[0] || 'Main Kalash'

    setTransactionForm((current) => ({
      ...current,
      type: current.type || firstType,
      fundCategory: current.fundCategory || firstFund,
      status: current.status || firstStatus,
    }))

    setBookingForm((current) => ({
      ...current,
      slot: current.slot || firstSlot,
    }))

    setWhatsAppConfig((current) => ({
      ...current,
      provider: current.provider || whatsappProviders[0] || 'Mock Gateway',
    }))
  }, [transactionTypes, fundCategories, paymentStatuses, poojaSlots, whatsappProviders])

  const roleLabel = currentUser
    ? systemReference.roles?.[currentUser.role]?.label || ROLE_CONFIG[currentUser.role]?.label || currentUser.role
    : ''
  const compactRoleLabel = roleLabel
    .replace(' (Super Admin)', '')
    .replace(' / Accountant', '')
    .replace(' / Volunteer', '')
  const mandirProfile = systemReference.mandirProfile || MANDIR_PROFILE

  async function handleSetupSubmit(event) {
    event.preventDefault()
    setWorking(true)

    const payload = {
      trustee: {
        fullName: setupForm.trusteeName.trim(),
        username: setupForm.trusteeUsername.trim(),
        password: setupForm.trusteePassword,
      },
      mandirProfile: {
        name: setupForm.mandirName.trim(),
        address: setupForm.mandirAddress.trim(),
        pan: setupForm.mandirPan.trim(),
        reg80G: setupForm.mandir80G.trim(),
        trustNumber: setupForm.mandirTrustNumber.trim(),
        letterhead: setupForm.mandirLetterhead.trim(),
      },
      seedFamilies: [],
    }

    try {
      await apiRequest('/system/setup', {
        method: 'POST',
        body: payload,
      })

      const loginRes = await apiRequest('/auth/login', {
        method: 'POST',
        body: {
          username: payload.trustee.username,
          password: payload.trustee.password,
        },
      })
      const token = loginRes.token
      const nextRefreshToken = loginRes.refreshToken || ''
      setAuthToken(token)
      setRefreshToken(nextRefreshToken)
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token)
      if (nextRefreshToken) {
        window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, nextRefreshToken)
      }
      setSetupStatus({ initialized: true, checked: true })
      await fetchBootstrapData(token, loginRes.user)
      setNotice({ type: 'success', text: 'Initial setup completed.' })
    } catch (error) {
      showNotice('error', error.message)
    } finally {
      setWorking(false)
    }
  }

  async function handleLogin(event) {
    event.preventDefault()
    setWorking(true)

    try {
      const response = await apiRequest('/auth/login', {
        method: 'POST',
        body: {
          username: loginForm.username.trim(),
          password: loginForm.password,
        },
      })

      const token = response.token
      const nextRefreshToken = response.refreshToken || ''
      setAuthToken(token)
      setRefreshToken(nextRefreshToken)
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token)
      if (nextRefreshToken) {
        window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, nextRefreshToken)
      }
      await fetchBootstrapData(token, response.user)
      setNotice({ type: '', text: '' })
    } catch (error) {
      showNotice('error', error.message)
    } finally {
      setWorking(false)
    }
  }

  async function handleLogout() {
    if (refreshToken) {
      try {
        await apiRequest('/auth/logout', {
          method: 'POST',
          body: {
            refreshToken,
          },
        })
      } catch (error) {
        void error
      }
    }
    clearSession()
    setNotice({ type: '', text: '' })
    navigate('/login', { replace: true })
  }

  function resetFamilyForm() {
    setFamilyForm({ headName: '', gotra: '', whatsapp: '', address: '' })
  }

  function resetTransactionForm() {
    setTransactionForm((current) => ({
      ...current,
      type: transactionTypes[0] || 'Bhent',
      fundCategory: fundCategories[0] || 'Mandir Nirman',
      status: paymentStatuses[0] || 'Paid',
      amount: '',
      dueDate: '',
    }))
  }

  function resetRefundForm() {
    setRefundForm({ transactionId: '', reason: '' })
  }

  function resetAssetForm() {
    setAssetForm({ name: '', totalUnits: '' })
  }

  function resetCheckoutForm() {
    setCheckoutForm((current) => ({
      ...current,
      quantity: 1,
      expectedReturnDate: '',
    }))
  }

  function resetBookingForm() {
    setBookingForm((current) => ({
      ...current,
      date: toISODate(),
      notes: '',
    }))
  }

  async function handleFamilySubmit(event) {
    event.preventDefault()

    const payload = {
      headName: familyForm.headName.trim(),
      gotra: familyForm.gotra.trim(),
      whatsapp: familyForm.whatsapp.trim(),
      address: familyForm.address.trim(),
    }

    if (!payload.headName || !payload.gotra || !payload.whatsapp || !payload.address) {
      showNotice('error', 'All family profile fields are required.')
      return
    }
    if (!validateIndianWhatsApp(payload.whatsapp)) {
      showNotice('error', 'Primary WhatsApp must be in +91XXXXXXXXXX format.')
      return
    }

    setWorking(true)
    try {
      const response = await apiRequest('/families', {
        method: 'POST',
        token: authToken,
        body: payload,
      })

      const family = response.family
      setFamilies((current) => [...current, family])
      setSelectedFamilyId(family.familyId)
      setTransactionForm((current) => ({ ...current, familyId: family.familyId }))
      setCheckoutForm((current) => ({ ...current, familyId: family.familyId }))
      setBookingForm((current) => ({ ...current, familyId: family.familyId }))

      resetFamilyForm()
      showNotice('success', `Family profile ${family.familyId} created.`)
    } catch (error) {
      showNotice('error', error.message)
    } finally {
      setWorking(false)
    }
  }

  async function handleImportFamiliesCsv(event) {
    event.preventDefault()
    if (!familyCsvImport.trim()) {
      showNotice('error', 'Paste CSV content before importing.')
      return
    }

    setWorking(true)
    try {
      const response = await apiRequest('/families/import/csv', {
        method: 'POST',
        token: authToken,
        body: {
          csvData: familyCsvImport,
          mode: 'upsert',
        },
      })

      const rows = csvToRows(familyCsvImport)
      const parsedFamilies = rows
        .map((row) => ({
          familyId: row.familyId || row['Family ID'] || '',
          headName: row.headName || row['Head of Family'] || row.name || '',
          gotra: row.gotra || row.Gotra || '',
          whatsapp: row.whatsapp || row['Primary WhatsApp'] || row.phone || '',
          address: row.address || row.Address || '',
        }))
        .filter((family) => family.headName && family.gotra && family.whatsapp && family.address)

      if (parsedFamilies.length) {
        setFamilies((current) => {
          const byId = new Map(current.map((family) => [family.familyId, family]))
          let nextSequence =
            current.reduce((max, family) => {
              const numeric = Number(String(family.familyId || '').replace('FAM-', ''))
              return Number.isFinite(numeric) ? Math.max(max, numeric) : max
            }, 0) + 1

          for (const candidate of parsedFamilies) {
            let familyId = candidate.familyId
            if (!familyId) {
              familyId = `FAM-${String(nextSequence).padStart(4, '0')}`
              nextSequence += 1
            }
            byId.set(familyId, {
              familyId,
              headName: candidate.headName,
              gotra: candidate.gotra,
              whatsapp: candidate.whatsapp,
              address: candidate.address,
            })
          }
          return Array.from(byId.values())
        })
      }

      showNotice(
        'success',
        `Family import complete: ${response.created || 0} created, ${response.updated || 0} updated, ${
          response.skipped || 0
        } skipped.`,
      )
      setFamilyCsvImport('')
    } catch (error) {
      showNotice('error', error.message)
    } finally {
      setWorking(false)
    }
  }

  async function handleExportFamiliesCsv() {
    try {
      await downloadCsvReport('/families/export/csv', 'families.csv')
      showNotice('success', 'Families CSV exported.')
    } catch (error) {
      showNotice('error', error.message)
    }
  }

  async function handleExportTransactionsCsv() {
    try {
      await downloadCsvReport('/transactions/export/csv', 'transactions.csv')
      showNotice('success', 'Transactions CSV exported.')
    } catch (error) {
      showNotice('error', error.message)
    }
  }

  async function handleExportBookingsCsv() {
    try {
      await downloadCsvReport('/scheduler/bookings/export/csv', 'pooja_bookings.csv')
      showNotice('success', 'Pooja bookings CSV exported.')
    } catch (error) {
      showNotice('error', error.message)
    }
  }

  async function handleTransactionSubmit(event) {
    event.preventDefault()

    const amount = Number(transactionForm.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      showNotice('error', 'Enter a valid donation amount.')
      return
    }

    setWorking(true)
    try {
      const response = await apiRequest('/transactions', {
        method: 'POST',
        token: authToken,
        body: {
          familyId: transactionForm.familyId,
          type: transactionForm.type,
          fundCategory: transactionForm.fundCategory,
          status: transactionForm.status,
          amount,
          dueDate: transactionForm.dueDate,
          munimName: actingMunim.trim() || DEFAULT_MUNIM_NAME,
          trusteeOverride: canBypassBlocks,
        },
      })

      const created = {
        ...response.transaction,
        receiptUrl: toAbsoluteUrl(response.transaction.receiptPath || ''),
      }
      setTransactions((current) => [created, ...current])
      resetTransactionForm()
      await refreshDashboard()
      if (canManageWhatsApp) {
        await refreshWhatsApp()
      }
      showDonationNoticeWithWhatsApp(response.whatsappLog, `Transaction ${created.id} recorded.`)
    } catch (error) {
      showNotice('error', error.message)
    } finally {
      setWorking(false)
    }
  }

  async function handleMarkPledgeAsPaid(transactionId) {
    setWorking(true)
    try {
      const response = await apiRequest(`/transactions/${transactionId}/status`, {
        method: 'PATCH',
        token: authToken,
        body: {
          status: 'Paid',
          munimName: actingMunim.trim() || DEFAULT_MUNIM_NAME,
          trusteeOverride: canBypassBlocks,
        },
      })

      const updated = {
        ...response.transaction,
        receiptUrl: toAbsoluteUrl(response.transaction.receiptPath || ''),
      }

      setTransactions((current) =>
        current.map((transaction) => (transaction.id === transactionId ? updated : transaction)),
      )

      await refreshDashboard()
      if (canManageWhatsApp) {
        await refreshWhatsApp()
      }
      showDonationNoticeWithWhatsApp(
        response.whatsappLog,
        `Transaction ${transactionId} settled and receipt generated.`,
      )
    } catch (error) {
      showNotice('error', error.message)
    } finally {
      setWorking(false)
    }
  }

  async function handleRefundSubmit(event) {
    event.preventDefault()

    if (!refundForm.transactionId || !refundForm.reason.trim()) {
      showNotice('error', 'Transaction and reason are required for cancellation/refund.')
      return
    }

    setWorking(true)
    try {
      const response = await apiRequest(`/transactions/${refundForm.transactionId}/cancel`, {
        method: 'POST',
        token: authToken,
        body: {
          reason: refundForm.reason.trim(),
          trusteeOverride: canBypassBlocks,
        },
      })

      if (response.approvalRequest) {
        setApprovalQueue((current) => [response.approvalRequest, ...current])
        resetRefundForm()
        showNotice('success', `Approval request ${response.approvalRequest.id} submitted.`)
        return
      }

      setTransactions((current) =>
        current.map((transaction) => {
          if (transaction.id !== refundForm.transactionId) return transaction
          return {
            ...transaction,
            cancelled: true,
            cancellationReason: refundForm.reason.trim(),
            cancellationAt: new Date().toISOString(),
          }
        }),
      )
      setCancellationLogs((current) => [response.cancellationLog, ...current])
      resetRefundForm()
      await refreshDashboard()
      showNotice('success', `Cancellation/refund log added for ${response.cancellationLog.transactionId}.`)
    } catch (error) {
      showNotice('error', error.message)
    } finally {
      setWorking(false)
    }
  }

  async function handleAssetSubmit(event) {
    event.preventDefault()

    setWorking(true)
    try {
      const response = await apiRequest('/inventory/assets', {
        method: 'POST',
        token: authToken,
        body: {
          name: assetForm.name,
          totalUnits: Number(assetForm.totalUnits),
        },
      })

      const created = response.asset
      setAssets((current) => [...current, created])
      setCheckoutForm((current) => ({ ...current, assetId: created.id }))
      resetAssetForm()
      showNotice('success', `Asset ${created.id} added.`)
    } catch (error) {
      showNotice('error', error.message)
    } finally {
      setWorking(false)
    }
  }

  async function handleCheckoutSubmit(event) {
    event.preventDefault()

    setWorking(true)
    try {
      const response = await apiRequest('/inventory/assets/checkouts', {
        method: 'POST',
        token: authToken,
        body: {
          assetId: checkoutForm.assetId,
          familyId: checkoutForm.familyId,
          quantity: Number(checkoutForm.quantity),
          expectedReturnDate: checkoutForm.expectedReturnDate,
        },
      })

      const created = response.checkout
      setAssetCheckouts((current) => [created, ...current])
      setAssets((current) =>
        current.map((asset) => {
          if (asset.id !== created.assetId) return asset
          return {
            ...asset,
            availableUnits: Math.max(0, asset.availableUnits - created.quantity),
          }
        }),
      )
      resetCheckoutForm()
      await refreshDashboard()
      showNotice('success', `Checkout ${created.id} created.`)
    } catch (error) {
      showNotice('error', error.message)
    } finally {
      setWorking(false)
    }
  }

  async function handleReturnCheckout(checkoutId) {
    setWorking(true)
    try {
      const response = await apiRequest(`/inventory/assets/checkouts/${checkoutId}/return`, {
        method: 'POST',
        token: authToken,
      })

      const updated = response.checkout
      setAssetCheckouts((current) =>
        current.map((checkout) => (checkout.id === checkoutId ? updated : checkout)),
      )

      setAssets((current) =>
        current.map((asset) => {
          if (asset.id !== updated.assetId) return asset
          return {
            ...asset,
            availableUnits: Math.min(asset.totalUnits, asset.availableUnits + updated.quantity),
          }
        }),
      )
      await refreshDashboard()
      showNotice('success', `Checkout ${checkoutId} marked returned.`)
    } catch (error) {
      showNotice('error', error.message)
    } finally {
      setWorking(false)
    }
  }

  async function handleBookingSubmit(event) {
    event.preventDefault()

    setWorking(true)
    try {
      const response = await apiRequest('/scheduler/bookings', {
        method: 'POST',
        token: authToken,
        body: {
          date: bookingForm.date,
          slot: bookingForm.slot,
          familyId: bookingForm.familyId,
          notes: bookingForm.notes,
          trusteeOverride: canBypassBlocks,
        },
      })

      setPoojaBookings((current) => [response.booking, ...current])
      resetBookingForm()
      await refreshDashboard()
      showNotice('success', `Pooja slot booked (${response.booking.id}).`)
    } catch (error) {
      showNotice('error', error.message)
    } finally {
      setWorking(false)
    }
  }

  async function handleSaveWhatsAppConfig(event) {
    event.preventDefault()

    setWorking(true)
    try {
      const response = await apiRequest('/whatsapp/config', {
        method: 'PUT',
        token: authToken,
        body: whatsAppConfig,
      })
      setWhatsAppConfig((current) => ({
        ...current,
        ...(response.whatsappConfig || {}),
      }))
      showNotice('success', 'WhatsApp provider configuration updated.')
    } catch (error) {
      showNotice('error', error.message)
    } finally {
      setWorking(false)
    }
  }

  async function runDueDateSweep() {
    setWorking(true)
    try {
      const response = await apiRequest('/whatsapp/run-due-sweep', {
        method: 'POST',
        token: authToken,
        body: {},
      })
      await refreshWhatsApp()
      showNotice('success', `Reminder sweep complete. ${response.reminderCount} reminder(s) processed.`)
    } catch (error) {
      showNotice('error', error.message)
    } finally {
      setWorking(false)
    }
  }

  async function runRetrySweep() {
    setWorking(true)
    try {
      const response = await apiRequest('/whatsapp/run-retry-sweep', {
        method: 'POST',
        token: authToken,
        body: {},
      })
      await refreshWhatsApp()
      showNotice('success', `Retry sweep complete. ${response.retriedCount} queued message(s) processed.`)
    } catch (error) {
      showNotice('error', error.message)
    } finally {
      setWorking(false)
    }
  }

  async function handleApprovalDecision(approvalId, decision) {
    const path = decision === 'approve' ? `/approvals/${approvalId}/approve` : `/approvals/${approvalId}/reject`
    setWorking(true)
    try {
      await apiRequest(path, {
        method: 'POST',
        token: authToken,
        body: {
          note: '',
        },
      })
      await refreshApprovals()
      await refreshDashboard()
      showNotice('success', `Approval ${approvalId} ${decision}d.`)
    } catch (error) {
      showNotice('error', error.message)
    } finally {
      setWorking(false)
    }
  }

  const paidTransactions = transactions.filter((transaction) => transaction.status === 'Paid')
  const pledgedTransactions = transactions.filter((transaction) => transaction.status === 'Pledged')
  const activePaidTransactions = paidTransactions.filter((transaction) => !transaction.cancelled)
  const activePledgedTransactions = pledgedTransactions.filter((transaction) => !transaction.cancelled)
  const totalCollectionAmount = activePaidTransactions.reduce((sum, transaction) => sum + transaction.amount, 0)
  const pendingPledgeAmount = activePledgedTransactions.reduce((sum, transaction) => sum + transaction.amount, 0)
  const todaysCollectionAmount = dashboardMetrics.todayPaidTotal ?? localMetrics.todayPaidTotal
  const recentDonations = activePaidTransactions.slice(0, 5)
  const upcomingPooja = poojaBookings
    .filter((booking) => booking.date >= toISODate())
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .slice(0, 5)

  const roleDashboardSubtitle = {
    trustee: 'Trustee Dashboard - God View Access',
    admin: 'Munim Dashboard - Administrative Access',
    executive: 'Sevadar Dashboard - Read-only Access',
  }[currentUser?.role] || `${roleLabel} Dashboard`

  const sidebarModules = [
    { id: 'dashboard', label: 'Dashboard', icon: '\u{1F4CA}' },
    { id: 'directory', label: 'Devotee Directory', icon: '\u{1F465}' },
    { id: 'finance', label: 'Donations', icon: '\u20B9' },
    { id: 'payments', label: 'Online Payments', icon: '\u{1F4B3}' },
    { id: 'portal', label: 'Devotee Portal', icon: '\u{1F4F1}' },
    { id: 'expenses', label: 'Expenses', icon: '\u{1F9FE}' },
    { id: 'accounting', label: 'Accounting', icon: '\u{1F4D2}' },
    { id: 'events', label: 'Events', icon: '\u{1F389}' },
    { id: 'content', label: 'Website Content', icon: '\u{1F4DA}' },
    { id: 'staff', label: 'User Access', icon: '\u{1F511}' },
    { id: 'inventory', label: 'Bhandar', icon: '\u{1F4E6}' },
    { id: 'scheduler', label: 'Pooja Scheduler', icon: '\u{1F4C5}' },
  ].filter((entry) => visibleModules.some((module) => module.id === entry.id))
  const mobilePrimaryModules = sidebarModules.slice(0, 4)
  const mobileOverflowModules = sidebarModules.slice(4)
  const isMoreTabActive =
    isMoreMenuOpen || mobileOverflowModules.some((module) => module.id === activeModule)
  const dashboardCurrencyFormatter = useMemo(
    () => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }),
    [],
  )

  function handleModuleTabClick(moduleId) {
    const targetPath = getPathForModule(moduleId)
    if (location.pathname !== targetPath) {
      navigate(targetPath)
    }
    setActiveModule(moduleId)
    setIsMoreMenuOpen(false)
  }

  function formatDashboardAmount(value) {
    return dashboardCurrencyFormatter.format(Number(value) || 0)
  }

  if (bootstrapping) {
    return (
      <div className="app-shell">
        <section className="loader-card loader-card-enhanced">
          <div className="loader-temple" aria-hidden="true">
            <span className="loader-orbit loader-orbit-outer" />
            <span className="loader-orbit loader-orbit-inner" />
            <span className="loader-core">&#128725;</span>
          </div>
          <p className="eyebrow">Jain Mandir Management System</p>
          <h1>Loading workspace...</h1>
          <p className="subtitle">Connecting to backend services and restoring your session.</p>
          <div className="loader-progress" role="presentation">
            <span />
          </div>
        </section>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="make-auth-shell">
        <LanguageToggle
          language={language}
          onChangeLanguage={setLanguage}
          className="language-toggle-login"
        />
        <main className="make-auth-content">
          <section className="make-login-card">
            <div className="make-mandir-mark" aria-hidden="true">
              &#128725;
            </div>
            <h1 className="make-login-title">Jain Mandir Management System</h1>
            <p className="make-login-subtitle">
              {setupStatus.checked && !setupStatus.initialized
                ? 'Complete first-run setup to activate the platform'
                : 'Enter your credentials to access the system'}
            </p>

            {notice.text && <div className={`notice ${notice.type}`}>{notice.text}</div>}

            {setupStatus.checked && !setupStatus.initialized ? (
              <form className="stack-form make-login-form" onSubmit={handleSetupSubmit}>
                <label>
                  Trustee Full Name
                  <input
                    value={setupForm.trusteeName}
                    onChange={(event) => setSetupForm((current) => ({ ...current, trusteeName: event.target.value }))}
                  />
                </label>
                <label>
                  Trustee Username
                  <input
                    value={setupForm.trusteeUsername}
                    onChange={(event) =>
                      setSetupForm((current) => ({ ...current, trusteeUsername: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Trustee Password
                  <input
                    type="password"
                    value={setupForm.trusteePassword}
                    onChange={(event) =>
                      setSetupForm((current) => ({ ...current, trusteePassword: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Mandir Name
                  <input
                    value={setupForm.mandirName}
                    onChange={(event) => setSetupForm((current) => ({ ...current, mandirName: event.target.value }))}
                  />
                </label>
                <label>
                  Mandir Address
                  <input
                    value={setupForm.mandirAddress}
                    onChange={(event) => setSetupForm((current) => ({ ...current, mandirAddress: event.target.value }))}
                  />
                </label>
                <label>
                  PAN
                  <input
                    value={setupForm.mandirPan}
                    onChange={(event) => setSetupForm((current) => ({ ...current, mandirPan: event.target.value }))}
                  />
                </label>
                <label>
                  80G Registration
                  <input
                    value={setupForm.mandir80G}
                    onChange={(event) => setSetupForm((current) => ({ ...current, mandir80G: event.target.value }))}
                  />
                </label>
                <label>
                  Trust Number
                  <input
                    value={setupForm.mandirTrustNumber}
                    onChange={(event) =>
                      setSetupForm((current) => ({ ...current, mandirTrustNumber: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Letterhead
                  <input
                    value={setupForm.mandirLetterhead}
                    onChange={(event) =>
                      setSetupForm((current) => ({ ...current, mandirLetterhead: event.target.value }))
                    }
                  />
                </label>
                <button type="submit" className="make-login-btn" disabled={working}>
                  {working ? 'Setting up...' : 'Complete Setup'}
                </button>
              </form>
            ) : (
              <>
                <form className="stack-form make-login-form" onSubmit={handleLogin}>
                  <label>
                    Username
                    <input
                      value={loginForm.username}
                      onChange={(event) => setLoginForm((current) => ({ ...current, username: event.target.value }))}
                      placeholder=""
                    />
                  </label>
                  <label>
                    Password
                    <input
                      type="password"
                      value={loginForm.password}
                      onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                      placeholder=""
                    />
                  </label>
                  <button type="submit" className="make-login-btn" disabled={working}>
                    {working ? 'Signing in...' : 'Login'}
                  </button>
                </form>
                <p className="hint">Use your assigned username and password. Contact trustee/admin if access is needed.</p>
              </>
            )}
          </section>
        </main>
      </div>
    )
  }

  return (
    <div
      className="make-auth-shell make-dashboard-screen"
      data-role={currentUser.role}
      data-connection-state={backendStatus.state}
      data-report-state={trusteeSummary.reportDate ? 'ready' : 'idle'}
    >
      <AppHeader
        language={language}
        onChangeLanguage={setLanguage}
        canManageWhatsApp={canManageWhatsApp}
        onOpenWhatsAppLogs={() => handleModuleTabClick('whatsapp')}
        currentUser={currentUser}
        compactRoleLabel={compactRoleLabel}
        mandirProfile={mandirProfile}
        onLogout={handleLogout}
        fallbackAddress={MANDIR_PROFILE.address}
      />

      <div className="make-workspace-layout">
        <ModuleSidebar
          sidebarModules={sidebarModules}
          mobilePrimaryModules={mobilePrimaryModules}
          mobileOverflowModules={mobileOverflowModules}
          activeModule={activeModule}
          isMoreMenuOpen={isMoreMenuOpen}
          isMoreTabActive={isMoreTabActive}
          onSelectModule={handleModuleTabClick}
          onToggleMoreMenu={() => setIsMoreMenuOpen((current) => !current)}
        />

        <main className="make-main-panel" ref={mainPanelRef}>
          {notice.text && <div className={`notice ${notice.type}`}>{notice.text}</div>}

          {activeModule === 'dashboard' && (
            <DashboardPage
              currentUser={currentUser}
              roleDashboardSubtitle={roleDashboardSubtitle}
              localMetrics={localMetrics}
              families={families}
              formatDashboardAmount={formatDashboardAmount}
              todaysCollectionAmount={todaysCollectionAmount}
              totalCollectionAmount={totalCollectionAmount}
              pendingPledgeAmount={pendingPledgeAmount}
              recentDonations={recentDonations}
              upcomingPooja={upcomingPooja}
              familyLookup={familyLookup}
              canViewReports={canViewReports}
              analyticsReport={analyticsReport}
              formatDate={formatDate}
              formatCurrency={formatCurrency}
            />
          )}

          {activeModule === 'directory' && (
            <DirectoryPage
              familySearch={familySearch}
              setFamilySearch={setFamilySearch}
              handleExportFamiliesCsv={handleExportFamiliesCsv}
              filteredFamilies={filteredFamilies}
              families={families}
              selectedFamilyId={selectedFamilyId}
              setSelectedFamilyId={setSelectedFamilyId}
              selectedFamilyLifetime={selectedFamilyLifetime}
              selectedFamilyPendingBoli={selectedFamilyPendingBoli}
              selectedFamilyTransactions={selectedFamilyTransactions}
              formatCurrency={formatCurrency}
              permissions={permissions}
              handleFamilySubmit={handleFamilySubmit}
              familyForm={familyForm}
              setFamilyForm={setFamilyForm}
              working={working}
              handleImportFamiliesCsv={handleImportFamiliesCsv}
              familyCsvImport={familyCsvImport}
              setFamilyCsvImport={setFamilyCsvImport}
            />
          )}

          {activeModule === 'finance' && (
            <FinancePage
              permissions={permissions}
              handleTransactionSubmit={handleTransactionSubmit}
              transactionForm={transactionForm}
              setTransactionForm={setTransactionForm}
              transactionTypes={transactionTypes}
              families={families}
              fundCategories={fundCategories}
              paymentStatuses={paymentStatuses}
              working={working}
              transactionSearch={transactionSearch}
              setTransactionSearch={setTransactionSearch}
              handleExportTransactionsCsv={handleExportTransactionsCsv}
              filteredTransactions={filteredTransactions}
              transactions={transactions}
              familyLookup={familyLookup}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
              handleMarkPledgeAsPaid={handleMarkPledgeAsPaid}
              canCancelOrRefund={canCancelOrRefund}
              handleRefundSubmit={handleRefundSubmit}
              refundForm={refundForm}
              setRefundForm={setRefundForm}
              paidTransactions={paidTransactions}
              cancellationLogs={cancellationLogs}
              approvalQueue={approvalQueue}
              handleApprovalDecision={handleApprovalDecision}
            />
          )}

          {activeModule === 'payments' && (permissions.managePayments || permissions.reconcilePayments) && (
            <PaymentsModule
              authToken={authToken}
              families={families}
              transactions={transactions}
              paymentGateways={paymentGateways}
              permissions={permissions}
              onNotice={showNotice}
              onRefreshTransactions={refreshTransactions}
            />
          )}

          {activeModule === 'portal' && permissions.accessDevoteePortal && (
            <PortalModule
              authToken={authToken}
              families={families}
              onNotice={showNotice}
            />
          )}

          {activeModule === 'expenses' && (permissions.manageExpenses || permissions.viewAccounting) && (
            <ExpensesModule
              authToken={authToken}
              expenseCategories={expenseCategories}
              permissions={permissions}
              approvalQueue={approvalQueue}
              onNotice={showNotice}
              onRefreshApprovals={refreshApprovals}
            />
          )}

          {activeModule === 'accounting' && permissions.viewAccounting && (
            <AccountingModule
              authToken={authToken}
              onNotice={showNotice}
            />
          )}

          {activeModule === 'events' && (permissions.manageEvents || permissions.viewSchedule) && (
            <EventsModule
              authToken={authToken}
              families={families}
              eventHalls={eventHalls}
              permissions={permissions}
              onNotice={showNotice}
              onRefreshTransactions={refreshTransactions}
            />
          )}

          {activeModule === 'content' && permissions.managePublicContent && (
            <ContentModule
              authToken={authToken}
              onNotice={showNotice}
            />
          )}

          {activeModule === 'staff' && permissions.manageStaffUsers && (
            <StaffModule
              authToken={authToken}
              currentUser={currentUser}
              roleConfig={systemReference.roles || ROLE_CONFIG}
              onNotice={showNotice}
            />
          )}

          {activeModule === 'whatsapp' && canManageWhatsApp && (
            <WhatsAppPage
              handleSaveWhatsAppConfig={handleSaveWhatsAppConfig}
              whatsAppConfig={whatsAppConfig}
              setWhatsAppConfig={setWhatsAppConfig}
              whatsappProviders={whatsappProviders}
              working={working}
              permissions={permissions}
              runDueDateSweep={runDueDateSweep}
              runRetrySweep={runRetrySweep}
              cronLastRunDate={cronLastRunDate}
              retrySweepLastRunAt={retrySweepLastRunAt}
              whatsAppRetryQueue={whatsAppRetryQueue}
              whatsAppLogs={whatsAppLogs}
              formatDate={formatDate}
            />
          )}

          {activeModule === 'inventory' && (
            <InventoryPage
              permissions={permissions}
              handleAssetSubmit={handleAssetSubmit}
              assetForm={assetForm}
              setAssetForm={setAssetForm}
              working={working}
              handleCheckoutSubmit={handleCheckoutSubmit}
              checkoutForm={checkoutForm}
              setCheckoutForm={setCheckoutForm}
              assets={assets}
              families={families}
              assetCheckouts={assetCheckouts}
              familyLookup={familyLookup}
              formatDate={formatDate}
              handleReturnCheckout={handleReturnCheckout}
            />
          )}

          {activeModule === 'scheduler' && (
            <SchedulerPage
              permissions={permissions}
              handleBookingSubmit={handleBookingSubmit}
              bookingForm={bookingForm}
              setBookingForm={setBookingForm}
              poojaSlots={poojaSlots}
              families={families}
              working={working}
              handleExportBookingsCsv={handleExportBookingsCsv}
              poojaBookings={poojaBookings}
              formatDate={formatDate}
              familyLookup={familyLookup}
            />
          )}
        </main>
      </div>
    </div>
  )
}


