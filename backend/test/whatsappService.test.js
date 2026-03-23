const test = require('node:test')
const assert = require('node:assert/strict')

const serviceModulePath = require.resolve('../src/services/whatsappService')
const dbModulePath = require.resolve('../src/store/db')
const envModulePath = require.resolve('../src/config/env')

function loadServiceWithMocks({ db, env }) {
  const originalDbModule = require.cache[dbModulePath]
  const originalEnvModule = require.cache[envModulePath]
  const originalServiceModule = require.cache[serviceModulePath]

  let saveCount = 0

  require.cache[dbModulePath] = {
    id: dbModulePath,
    filename: dbModulePath,
    loaded: true,
    exports: {
      getDb: () => db,
      saveDb: async () => {
        saveCount += 1
      },
    },
  }

  require.cache[envModulePath] = {
    id: envModulePath,
    filename: envModulePath,
    loaded: true,
    exports: {
      env: {
        receiptPublicBaseUrl: '',
        port: 4000,
        whatsappAccessToken: '',
        whatsappTemplateInstantReceipt: '',
        whatsappTemplatePledgeReminder: '',
        whatsappTemplateLanguage: 'en_US',
        whatsappTemplatePassFullMessageAsBodyParam: false,
        whatsappTemplateSendFollowupText: false,
        whatsappUseTemplateForReceipts: false,
        ...env,
      },
    },
  }

  delete require.cache[serviceModulePath]
  const service = require('../src/services/whatsappService')

  function restore() {
    delete require.cache[serviceModulePath]

    if (originalDbModule) {
      require.cache[dbModulePath] = originalDbModule
    } else {
      delete require.cache[dbModulePath]
    }

    if (originalEnvModule) {
      require.cache[envModulePath] = originalEnvModule
    } else {
      delete require.cache[envModulePath]
    }

    if (originalServiceModule) {
      require.cache[serviceModulePath] = originalServiceModule
    }
  }

  return {
    service,
    restore,
    getSaveCount: () => saveCount,
  }
}

test('sendWhatsAppTemplate skips Meta sample placeholder templates', async () => {
  const db = {
    families: [
      {
        familyId: 'FAM-001',
        headName: 'Amit Jain',
        whatsapp: '+919876543210',
        mandirId: 'MANDIR-001',
      },
    ],
    whatsappConfig: {
      provider: 'Meta WhatsApp Cloud API',
      apiUrl: '',
      accessToken: '',
      businessNumber: '',
      mandirId: 'MANDIR-001',
    },
    whatsappLogs: [],
    whatsAppRetryQueue: [],
  }

  const originalFetch = global.fetch
  global.fetch = async () => {
    throw new Error('fetch should not be called when template config is invalid')
  }

  const { service, restore, getSaveCount } = loadServiceWithMocks({
    db,
    env: {
      whatsappUseTemplateForReceipts: true,
      whatsappTemplateInstantReceipt: 'hello_world',
    },
  })

  try {
    const log = await service.sendWhatsAppTemplate({
      transaction: {
        id: 'TRX-001',
        familyId: 'FAM-001',
        type: 'Bhent',
        fundCategory: 'General Fund',
        amount: 1100,
        receiptPath: '',
        receiptVerificationUrl: '',
        mandirId: 'MANDIR-001',
      },
      templateType: 'instant_receipt',
      trigger: 'status_paid',
      initiatedBy: 'admin',
    })

    assert.equal(log.status, 'Skipped')
    assert.match(log.detail, /sample placeholder/i)
    assert.equal(db.whatsappLogs.length, 1)
    assert.equal(db.whatsappLogs[0].status, 'Skipped')
    assert.equal(getSaveCount(), 1)
  } finally {
    global.fetch = originalFetch
    restore()
  }
})
