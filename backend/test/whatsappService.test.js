const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const test = require('node:test')
const assert = require('node:assert/strict')

const serviceModulePath = require.resolve('../src/services/whatsappService')
const dbModulePath = require.resolve('../src/store/db')
const envModulePath = require.resolve('../src/config/env')

function loadServiceWithMocks({ db, env, runtimeEnvPath } = {}) {
  const originalDbModule = require.cache[dbModulePath]
  const originalEnvModule = require.cache[envModulePath]
  const originalServiceModule = require.cache[serviceModulePath]
  const originalRuntimeEnvPath = process.env.JMMS_RUNTIME_ENV_PATH
  process.env.JMMS_RUNTIME_ENV_PATH = runtimeEnvPath || path.join(__dirname, '__missing_runtime__.env')

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
        whatsappAllowSampleTemplate: false,
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

    if (originalRuntimeEnvPath === undefined) {
      delete process.env.JMMS_RUNTIME_ENV_PATH
    } else {
      process.env.JMMS_RUNTIME_ENV_PATH = originalRuntimeEnvPath
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

test('sendWhatsAppTemplate can use hello_world when sample template is explicitly allowed', async () => {
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
      accessToken: 'config-token',
      businessNumber: '',
      mandirId: 'MANDIR-001',
    },
    whatsappLogs: [],
    whatsAppRetryQueue: [],
  }

  const fetchCalls = []
  const originalFetch = global.fetch
  global.fetch = async (_url, options = {}) => {
    fetchCalls.push(JSON.parse(options.body || '{}'))
    return {
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          sent: true,
          mode: 'template_then_text',
          followupSent: true,
          result: {
            contacts: [{ wa_id: '919876543210' }],
            messages: [{ id: 'wamid.hello-world-001' }],
          },
        }),
    }
  }

  const { service, restore } = loadServiceWithMocks({
    db,
    env: {
      receiptPublicBaseUrl: 'https://runtime.example',
      whatsappUseTemplateForReceipts: true,
      whatsappAllowSampleTemplate: true,
      whatsappTemplateInstantReceipt: 'hello_world',
      whatsappTemplateSendFollowupText: true,
    },
  })

  try {
    const log = await service.sendWhatsAppTemplate({
      transaction: {
        id: 'TRX-HELLO',
        familyId: 'FAM-001',
        type: 'Bhent',
        fundCategory: 'General Fund',
        amount: 1100,
        receiptPath: '/receipts/TRX-HELLO.pdf',
        receiptFileName: 'TRX-HELLO.pdf',
        receiptVerificationUrl: '',
        mandirId: 'MANDIR-001',
      },
      templateType: 'instant_receipt',
      trigger: 'status_paid',
      initiatedBy: 'admin',
    })

    assert.equal(log.status, 'Sent')
    assert.equal(fetchCalls.length, 1)
    assert.equal(fetchCalls[0].meta.useTemplate, true)
    assert.equal(fetchCalls[0].meta.templateName, 'hello_world')
    assert.equal(fetchCalls[0].meta.allowSampleTemplate, true)
    assert.equal(fetchCalls[0].meta.sendFollowupText, true)
    assert.equal(fetchCalls[0].meta.followupDocumentUrl, 'https://runtime.example/receipts/TRX-HELLO.pdf')
    assert.equal(fetchCalls[0].meta.followupDocumentFilename, 'TRX-HELLO.pdf')
  } finally {
    global.fetch = originalFetch
    restore()
  }
})

test('sendWhatsAppTemplate prepares body and receipt button params for a custom receipt template', async () => {
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
      accessToken: 'config-token',
      businessNumber: '',
      mandirId: 'MANDIR-001',
    },
    whatsappLogs: [],
    whatsAppRetryQueue: [],
  }

  const fetchCalls = []
  const originalFetch = global.fetch
  global.fetch = async (_url, options = {}) => {
    fetchCalls.push(JSON.parse(options.body || '{}'))
    return {
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          sent: true,
          mode: 'template_then_document',
          followupSent: true,
          result: {
            contacts: [{ wa_id: '919876543210' }],
            messages: [{ id: 'wamid.custom-template-001' }],
          },
        }),
    }
  }

  const { service, restore } = loadServiceWithMocks({
    db,
    env: {
      receiptPublicBaseUrl: 'https://runtime.example',
      whatsappUseTemplateForReceipts: true,
      whatsappTemplateInstantReceipt: 'jmms_receipt',
      whatsappTemplateSendFollowupText: false,
    },
  })

  try {
    const log = await service.sendWhatsAppTemplate({
      transaction: {
        id: 'TRX-CUSTOM',
        familyId: 'FAM-001',
        type: 'Bhent',
        fundCategory: 'Mandir Nirman',
        amount: 1100,
        receiptPath: '/receipts/TRX-CUSTOM.pdf',
        receiptFileName: 'TRX-CUSTOM.pdf',
        receiptVerificationUrl: '',
        mandirId: 'MANDIR-001',
      },
      templateType: 'instant_receipt',
      trigger: 'status_paid',
      initiatedBy: 'admin',
    })

    assert.equal(log.status, 'Sent')
    assert.equal(fetchCalls.length, 1)
    assert.equal(fetchCalls[0].meta.templateName, 'jmms_receipt')
    assert.deepEqual(fetchCalls[0].meta.templateBodyParams, ['Amit Jain', '1,100.00'])
    assert.deepEqual(fetchCalls[0].meta.templateButtonUrlParams, ['TRX-CUSTOM.pdf'])
    assert.equal(fetchCalls[0].meta.templateButtonUrlIndex, '0')
  } finally {
    global.fetch = originalFetch
    restore()
  }
})

test('sendWhatsAppTemplate reads the latest backend env file without restart', async () => {
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
      accessToken: 'config-token',
      businessNumber: '',
      mandirId: 'MANDIR-001',
    },
    whatsappLogs: [],
    whatsAppRetryQueue: [],
  }

  const runtimeEnvDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jmms-whatsapp-runtime-'))
  const runtimeEnvPath = path.join(runtimeEnvDir, '.env')
  fs.writeFileSync(
    runtimeEnvPath,
    [
      'RECEIPT_PUBLIC_BASE_URL=https://runtime.example',
      'WHATSAPP_USE_TEMPLATE_FOR_RECEIPTS=false',
      'WHATSAPP_TEMPLATE_INSTANT_RECEIPT=',
      'WHATSAPP_TEMPLATE_LANGUAGE=en_US',
      'WHATSAPP_TEMPLATE_PASS_FULL_MESSAGE_AS_BODY_PARAM=false',
      'WHATSAPP_TEMPLATE_SEND_FOLLOWUP_TEXT=false',
    ].join('\n'),
    'utf8',
  )

  const fetchCalls = []
  const originalFetch = global.fetch
  global.fetch = async (url, options = {}) => {
    fetchCalls.push({
      url,
      headers: options.headers || {},
      body: JSON.parse(options.body || '{}'),
    })
    return {
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          sent: true,
          mode: 'text_only',
          result: {
            contacts: [{ wa_id: '919876543210' }],
            messages: [{ id: 'wamid.test-001' }],
          },
        }),
    }
  }

  const { service, restore, getSaveCount } = loadServiceWithMocks({
    db,
    env: {
      receiptPublicBaseUrl: 'https://stale.example',
      whatsappUseTemplateForReceipts: true,
      whatsappTemplateInstantReceipt: 'hello_world',
    },
    runtimeEnvPath,
  })

  try {
    const log = await service.sendWhatsAppTemplate({
      transaction: {
        id: 'TRX-003',
        familyId: 'FAM-001',
        type: 'Bhent',
        fundCategory: 'General Fund',
        amount: 1100,
        receiptPath: '/receipts/TRX-003.pdf',
        receiptVerificationUrl: '',
        mandirId: 'MANDIR-001',
      },
      templateType: 'instant_receipt',
      trigger: 'status_paid',
      initiatedBy: 'admin',
    })

    assert.equal(log.status, 'Sent')
    assert.equal(log.providerMessageId, 'wamid.test-001')
    assert.equal(log.providerWaId, '919876543210')
    assert.equal(fetchCalls.length, 1)
    assert.equal(fetchCalls[0].body.meta.useTemplate, false)
    assert.match(fetchCalls[0].body.message, /https:\/\/runtime\.example\/receipts\/TRX-003\.pdf/)
    assert.equal(db.whatsappLogs.length, 1)
    assert.equal(db.whatsappLogs[0].status, 'Sent')
    assert.equal(getSaveCount(), 1)
  } finally {
    global.fetch = originalFetch
    restore()
    fs.rmSync(runtimeEnvDir, { recursive: true, force: true })
  }
})

test('sendWhatsAppTemplate skips when devotee number matches business sender number', async () => {
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
      accessToken: 'token',
      businessNumber: '+919876543210',
      mandirId: 'MANDIR-001',
    },
    whatsappLogs: [],
    whatsAppRetryQueue: [],
  }

  const originalFetch = global.fetch
  global.fetch = async () => {
    throw new Error('fetch should not be called when sender and receiver numbers are identical')
  }

  const { service, restore, getSaveCount } = loadServiceWithMocks({
    db,
    env: {
      whatsappUseTemplateForReceipts: false,
    },
  })

  try {
    const log = await service.sendWhatsAppTemplate({
      transaction: {
        id: 'TRX-002',
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
    assert.match(log.detail, /matches the configured business sender number/i)
    assert.equal(db.whatsappLogs.length, 1)
    assert.equal(getSaveCount(), 1)
  } finally {
    global.fetch = originalFetch
    restore()
  }
})
