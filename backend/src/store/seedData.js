const { MANDIR_PROFILE } = require('../constants/domain')
const { DEFAULT_MANDIR_ID } = require('../constants/tenant')
const { hashPassword } = require('../utils/passwords')

const MOCK_SEED_RECORD_IDS = Object.freeze({
  devoteeUsers: ['DVT-0001'],
  devoteeAffiliations: ['AFF-0001'],
  transactions: ['TRX-1001', 'TRX-1002'],
  paymentIntents: ['PAY-7001'],
  contentLibrary: ['CNT-5001', 'CNT-5002', 'CNT-5003'],
  expenses: ['EXP-4001', 'EXP-4002'],
  events: ['EVT-2001'],
  eventRegistrations: ['REG-3001'],
  assets: ['AST-101', 'AST-102', 'AST-103'],
  assetCheckouts: ['CHK-501', 'CHK-502'],
  poojaBookings: ['POO-9001'],
})

const MOCK_SEED_FAMILIES = Object.freeze([
  {
    familyId: 'FAM-0001',
    headName: 'Amit Jain',
    gotra: 'Kashyap',
    whatsapp: '+916263578372',
    address: 'Bapu Nagar, Jaipur',
  },
  {
    familyId: 'FAM-0002',
    headName: 'Neha Shah',
    gotra: 'Vatsa',
    whatsapp: '+919899001122',
    address: 'Malviya Nagar, Jaipur',
  },
  {
    familyId: 'FAM-0003',
    headName: 'Pratik Doshi',
    gotra: 'Bharadwaj',
    whatsapp: '+919955443322',
    address: 'Shastri Nagar, Jaipur',
  },
])

function getBootstrapValue(name, fallback) {
  const value = String(process.env[name] || '').trim()
  return value || fallback
}

function buildSeedData({ timeZone }) {
  const now = new Date().toISOString()
  const mandirId = DEFAULT_MANDIR_ID
  const superAdminUsername = getBootstrapValue('BOOTSTRAP_SUPER_ADMIN_USERNAME', 'superadmin').toLowerCase()
  const superAdminPassword = getBootstrapValue('BOOTSTRAP_SUPER_ADMIN_PASSWORD', 'SuperAdmin@2026')
  const superAdminName = getBootstrapValue('BOOTSTRAP_SUPER_ADMIN_NAME', 'Platform Super Admin')
  const trusteeUsername = getBootstrapValue('BOOTSTRAP_TRUSTEE_USERNAME', 'trustee').toLowerCase()
  const trusteePassword = getBootstrapValue('BOOTSTRAP_TRUSTEE_PASSWORD', 'Trustee@2026')
  const trusteeName = getBootstrapValue('BOOTSTRAP_TRUSTEE_NAME', 'Shri Trustee')
  const adminUsername = getBootstrapValue('BOOTSTRAP_ADMIN_USERNAME', 'admin').toLowerCase()
  const adminPassword = getBootstrapValue('BOOTSTRAP_ADMIN_PASSWORD', 'Admin@2026')
  const adminName = getBootstrapValue('BOOTSTRAP_ADMIN_NAME', 'Mandir Admin')
  const executiveUsername = getBootstrapValue('BOOTSTRAP_EXECUTIVE_USERNAME', 'executive').toLowerCase()
  const executivePassword = getBootstrapValue('BOOTSTRAP_EXECUTIVE_PASSWORD', 'Executive@2026')
  const executiveName = getBootstrapValue('BOOTSTRAP_EXECUTIVE_NAME', 'Sevadar Suman')

  return {
    version: 1,
    createdAt: now,
    mandirs: [
      {
        id: mandirId,
        name: MANDIR_PROFILE.name,
        address: MANDIR_PROFILE.address,
        pan: MANDIR_PROFILE.pan,
        reg80G: MANDIR_PROFILE.reg80G,
        trustNumber: MANDIR_PROFILE.trustNumber,
        letterhead: MANDIR_PROFILE.letterhead,
        timezone: timeZone || 'Asia/Kolkata',
        isActive: true,
        createdAt: now,
      },
    ],
    mandirProfile: { ...MANDIR_PROFILE },
    users: [
      {
        id: 'USR-SUPER-001',
        username: superAdminUsername,
        passwordHash: hashPassword(superAdminPassword),
        role: 'super_admin',
        fullName: superAdminName,
        mandirId: '',
      },
      {
        id: 'USR-TRUSTEE-001',
        username: trusteeUsername,
        passwordHash: hashPassword(trusteePassword),
        role: 'trustee',
        fullName: trusteeName,
        mandirId,
      },
      {
        id: 'USR-ADMIN-001',
        username: adminUsername,
        passwordHash: hashPassword(adminPassword),
        role: 'admin',
        fullName: adminName,
        mandirId,
      },
      {
        id: 'USR-EXEC-001',
        username: executiveUsername,
        passwordHash: hashPassword(executivePassword),
        role: 'executive',
        fullName: executiveName,
        mandirId,
      },
    ],
    devoteeUsers: [],
    devoteeAffiliations: [],
    families: [],
    transactions: [],
    paymentIntents: [],
    paymentPortal: {
      upiVpa: '',
      payeeName: MANDIR_PROFILE.name,
      bankName: '',
      accountNumber: '',
      ifsc: '',
      updatedAt: '',
      mandirId,
    },
    contentLibrary: [],
    expenses: [],
    events: [],
    eventRegistrations: [],
    cancellationLogs: [],
    assets: [],
    assetCheckouts: [],
    poojaBookings: [],
    whatsappConfig: {
      provider: 'Meta WhatsApp Cloud API',
      apiUrl: '',
      accessToken: '',
      businessNumber: '',
      updatedAt: now,
      mandirId,
    },
    whatsappLogs: [],
    globalCalendarEntries: [],
    deviceTokens: [],
    approvalRequests: [],
    whatsAppRetryQueue: [],
    jobs: {
      dueReminderLastRunDate: '',
      whatsAppRetryLastRunAt: '',
      setupCompletedAt: '',
      nextReceiptSequence: 1,
    },
    auth: {
      refreshTokens: [],
    },
  }
}

function removeArrayItems(db, key, predicate) {
  const items = Array.isArray(db[key]) ? db[key] : []
  const filtered = items.filter((item) => !predicate(item))
  if (filtered.length === items.length) {
    return false
  }
  db[key] = filtered
  return true
}

function matchesMockFamily(family, seedFamily) {
  return (
    String(family?.familyId || '') === seedFamily.familyId &&
    String(family?.headName || '') === seedFamily.headName &&
    String(family?.gotra || '') === seedFamily.gotra &&
    String(family?.whatsapp || '') === seedFamily.whatsapp &&
    String(family?.address || '') === seedFamily.address
  )
}

function stripMockSeedData(db) {
  if (!db || typeof db !== 'object' || Array.isArray(db)) {
    return false
  }

  let changed = false
  const familiesChanged = removeArrayItems(db, 'families', (family) =>
    MOCK_SEED_FAMILIES.some((seedFamily) => matchesMockFamily(family, seedFamily)),
  )
  if (familiesChanged) {
    changed = true
  }

  for (const [key, ids] of Object.entries(MOCK_SEED_RECORD_IDS)) {
    const changedForKey = removeArrayItems(db, key, (item) => ids.includes(String(item?.id || '').trim()))
    if (changedForKey) {
      changed = true
    }
  }

  const logsChanged = removeArrayItems(db, 'whatsappLogs', (log) => String(log?.status || '') === 'Mock Sent')
  if (logsChanged) {
    changed = true
  }

  const config = db.whatsappConfig && typeof db.whatsappConfig === 'object' ? db.whatsappConfig : {}
  if (config !== db.whatsappConfig) {
    db.whatsappConfig = config
    changed = true
  }
  if (String(config.provider || '').trim() === 'Mock Gateway') {
    config.provider = 'Meta WhatsApp Cloud API'
    config.updatedAt = new Date().toISOString()
    changed = true
  }

  return changed
}

module.exports = { buildSeedData, stripMockSeedData }
