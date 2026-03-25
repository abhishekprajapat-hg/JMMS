const http = require('node:http')
const test = require('node:test')
const assert = require('node:assert/strict')
const express = require('express')

const adapterModulePath = require.resolve('../src/routes/whatsappAdapterRoutes')
const envModulePath = require.resolve('../src/config/env')

function loadAdapterApp(envOverrides = {}) {
  const originalEnvModule = require.cache[envModulePath]
  const originalAdapterModule = require.cache[adapterModulePath]

  require.cache[envModulePath] = {
    id: envModulePath,
    filename: envModulePath,
    loaded: true,
    exports: {
      env: {
        whatsappAccessToken: 'env-token',
        whatsappPhoneNumberId: '1016928568166058',
        whatsappGraphVersion: 'v25.0',
        whatsappAllowSampleTemplate: false,
        ...envOverrides,
      },
    },
  }

  delete require.cache[adapterModulePath]
  const { whatsappAdapterRoutes } = require('../src/routes/whatsappAdapterRoutes')

  const app = express()
  app.use(express.json())
  app.use('/api/whatsapp/adapter', whatsappAdapterRoutes)
  app.use((error, _req, res, _next) => {
    res.status(error.status || 500).json({
      error: error.message || String(error),
    })
  })

  function restore() {
    delete require.cache[adapterModulePath]
    if (originalEnvModule) {
      require.cache[envModulePath] = originalEnvModule
    } else {
      delete require.cache[envModulePath]
    }
    if (originalAdapterModule) {
      require.cache[adapterModulePath] = originalAdapterModule
    }
  }

  return { app, restore }
}

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server))
  })
}

function requestJson(server, { method = 'POST', path = '/', body, headers = {} } = {}) {
  const payload = body ? JSON.stringify(body) : ''
  const address = server.address()

  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: '127.0.0.1',
        port: address.port,
        method,
        path,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          ...headers,
        },
      },
      (res) => {
        let raw = ''
        res.setEncoding('utf8')
        res.on('data', (chunk) => {
          raw += chunk
        })
        res.on('end', () => {
          let parsed = raw
          try {
            parsed = raw ? JSON.parse(raw) : {}
          } catch (_error) {}
          resolve({
            status: res.statusCode,
            body: parsed,
          })
        })
      },
    )

    req.on('error', reject)
    if (payload) {
      req.write(payload)
    }
    req.end()
  })
}

test('whatsapp adapter sends direct receipt document instead of hello_world when sample template is configured', async () => {
  const fetchCalls = []
  const responses = [
    {
      contacts: [{ wa_id: '917000445463' }],
      messages: [{ id: 'wamid.receipt-document-001' }],
    },
    {
      contacts: [{ wa_id: '917000445463' }],
      messages: [{ id: 'wamid.receipt-text-001' }],
    },
  ]
  const originalFetch = global.fetch
  global.fetch = async (_url, options = {}) => {
    fetchCalls.push(JSON.parse(options.body || '{}'))
    const payload = responses.shift()
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify(payload),
    }
  }

  const { app, restore } = loadAdapterApp()
  const server = await listen(app)

  try {
    const response = await requestJson(server, {
      path: '/api/whatsapp/adapter/send',
      headers: {
        Authorization: 'Bearer env-token',
      },
      body: {
        to: '+917000445463',
        message: 'hello_world',
        meta: {
          useTemplate: true,
          templateName: 'hello_world',
          templateLanguage: 'en_US',
          allowSampleTemplate: true,
          sendFollowupText: true,
          followupText: 'Jai Jinendra, your receipt is attached.',
          followupDocumentUrl: 'https://example.com/receipts/TRX-001.pdf',
          followupDocumentFilename: 'TRX-001.pdf',
          followupDocumentCaption: 'Jai Jinendra, your receipt is attached.',
        },
      },
    })

    assert.equal(response.status, 200)
    assert.equal(response.body.mode, 'document_then_text')
    assert.equal(response.body.bypassedSampleTemplate, true)
    assert.equal(response.body.followupSent, true)
    assert.equal(fetchCalls.length, 2)
    assert.equal(fetchCalls[0].type, 'document')
    assert.equal(fetchCalls[0].document.link, 'https://example.com/receipts/TRX-001.pdf')
    assert.equal(fetchCalls[0].document.filename, 'TRX-001.pdf')
    assert.equal(fetchCalls[1].type, 'text')
  } finally {
    server.close()
    global.fetch = originalFetch
    restore()
  }
})

test('whatsapp adapter falls back to template then receipt document when direct receipt delivery fails', async () => {
  const fetchCalls = []
  const responses = [
    {
      ok: false,
      status: 400,
      payload: {
        error: {
          code: 131047,
          message: 'Re-engagement message requires an approved template.',
        },
      },
    },
    {
      ok: false,
      status: 400,
      payload: {
        error: {
          code: 131047,
          message: 'Text re-engagement also requires an approved template.',
        },
      },
    },
    {
      ok: true,
      status: 200,
      payload: {
        contacts: [{ wa_id: '917000445463' }],
        messages: [{ id: 'wamid.template-001' }],
      },
    },
    {
      ok: true,
      status: 200,
      payload: {
        contacts: [{ wa_id: '917000445463' }],
        messages: [{ id: 'wamid.document-001' }],
      },
    },
  ]

  const originalFetch = global.fetch
  global.fetch = async (_url, options = {}) => {
    fetchCalls.push(JSON.parse(options.body || '{}'))
    const next = responses.shift()
    return {
      ok: next.ok,
      status: next.status,
      text: async () => JSON.stringify(next.payload),
    }
  }

  const { app, restore } = loadAdapterApp()
  const server = await listen(app)

  try {
    const response = await requestJson(server, {
      path: '/api/whatsapp/adapter/send',
      headers: {
        Authorization: 'Bearer env-token',
      },
      body: {
        to: '+917000445463',
        message: 'hello_world',
        meta: {
          useTemplate: true,
          templateName: 'hello_world',
          templateLanguage: 'en_US',
          allowSampleTemplate: true,
          sendFollowupText: true,
          followupText: 'Jai Jinendra, your receipt is attached.',
          followupDocumentUrl: 'https://example.com/receipts/TRX-002.pdf',
          followupDocumentFilename: 'TRX-002.pdf',
          followupDocumentCaption: 'Jai Jinendra, your receipt is attached.',
        },
      },
    })

    assert.equal(response.status, 200)
    assert.equal(response.body.mode, 'template_then_document')
    assert.equal(response.body.followupSent, true)
    assert.equal(fetchCalls.length, 4)
    assert.equal(fetchCalls[0].type, 'document')
    assert.equal(fetchCalls[1].type, 'text')
    assert.equal(fetchCalls[2].type, 'template')
    assert.equal(fetchCalls[2].template.name, 'hello_world')
    assert.equal(fetchCalls[3].type, 'document')
    assert.equal(fetchCalls[3].document.link, 'https://example.com/receipts/TRX-002.pdf')
  } finally {
    server.close()
    global.fetch = originalFetch
    restore()
  }
})

test('whatsapp adapter includes body vars and receipt button var for a custom template', async () => {
  const fetchCalls = []
  const originalFetch = global.fetch
  global.fetch = async (_url, options = {}) => {
    fetchCalls.push(JSON.parse(options.body || '{}'))
    return {
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          contacts: [{ wa_id: '917000445463' }],
          messages: [{ id: 'wamid.template-vars-001' }],
        }),
    }
  }

  const { app, restore } = loadAdapterApp()
  const server = await listen(app)

  try {
    const response = await requestJson(server, {
      path: '/api/whatsapp/adapter/send',
      headers: {
        Authorization: 'Bearer env-token',
      },
      body: {
        to: '+917000445463',
        meta: {
          useTemplate: true,
          templateName: 'jmms_receipt',
          templateLanguage: 'en_US',
          templateBodyParams: ['Abhishek Prajapat', '998.00'],
          templateButtonUrlParams: ['TRX-MN3379PE-VY2Y.pdf'],
          templateButtonUrlIndex: '0',
        },
      },
    })

    assert.equal(response.status, 200)
    assert.equal(response.body.mode, 'template_only')
    assert.equal(fetchCalls.length, 1)
    assert.equal(fetchCalls[0].type, 'template')
    assert.equal(fetchCalls[0].template.name, 'jmms_receipt')
    assert.deepEqual(fetchCalls[0].template.components, [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: 'Abhishek Prajapat' },
          { type: 'text', text: '998.00' },
        ],
      },
      {
        type: 'button',
        sub_type: 'url',
        index: '0',
        parameters: [{ type: 'text', text: 'TRX-MN3379PE-VY2Y.pdf' }],
      },
    ])
  } finally {
    server.close()
    global.fetch = originalFetch
    restore()
  }
})
