const fs = require('node:fs/promises')
const path = require('node:path')
const mongoose = require('mongoose')
const { env } = require('../config/env')
const { buildSeedData, stripMockSeedData } = require('./seedData')
const { ensureDbShape } = require('./schema')
const { loadStoreState, saveStoreState } = require('../models')

const DB_FILE = 'db.json'
const RECEIPT_DIR_NAME = 'receipts'
const UPLOAD_DIR_NAME = 'uploads'
const LEGACY_SNAPSHOT_COLLECTION = 'snapshots'
const LEGACY_SNAPSHOT_ID = 'jmms_main'

const dbPath = path.join(env.dataDir, DB_FILE)
const receiptDirPath = path.join(env.dataDir, RECEIPT_DIR_NAME)
const uploadDirPath = path.join(env.dataDir, UPLOAD_DIR_NAME)

let db = null
let storageMode = 'file'

function getMongoDbName(uri) {
  try {
    const parsed = new URL(uri)
    const name = parsed.pathname.replace('/', '')
    return name || 'jmms'
  } catch (_error) {
    return 'jmms'
  }
}

async function readLegacySnapshot(mongoDb) {
  const legacyCollections = await mongoDb
    .listCollections({ name: LEGACY_SNAPSHOT_COLLECTION }, { nameOnly: true })
    .toArray()
  if (!legacyCollections.length) {
    return null
  }

  const snapshot = await mongoDb.collection(LEGACY_SNAPSHOT_COLLECTION).findOne({ _id: LEGACY_SNAPSHOT_ID })
  if (!snapshot || !snapshot.payload || typeof snapshot.payload !== 'object' || Array.isArray(snapshot.payload)) {
    return null
  }
  return snapshot.payload
}

async function cleanupLegacySnapshot(mongoDb) {
  const legacyCollections = await mongoDb
    .listCollections({ name: LEGACY_SNAPSHOT_COLLECTION }, { nameOnly: true })
    .toArray()
  if (!legacyCollections.length) {
    return
  }

  const collection = mongoDb.collection(LEGACY_SNAPSHOT_COLLECTION)
  await collection.deleteOne({ _id: LEGACY_SNAPSHOT_ID })
  const remaining = await collection.estimatedDocumentCount()
  if (remaining === 0) {
    await collection.drop().catch(() => {})
  }
}

async function initMongoStore() {
  if (!env.mongoUri) return false

  try {
    await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 3000,
      dbName: getMongoDbName(env.mongoUri),
    })
    const mongoDb = mongoose.connection.db

    const loaded = await loadStoreState()
    if (loaded.hasData) {
      db = loaded.db
      await cleanupLegacySnapshot(mongoDb).catch(() => {})
      storageMode = 'mongo'
      return true
    }

    const legacySnapshotPayload = await readLegacySnapshot(mongoDb)
    if (legacySnapshotPayload) {
      db = legacySnapshotPayload
      await saveStoreState(db)
      await cleanupLegacySnapshot(mongoDb).catch(() => {})
      // eslint-disable-next-line no-console
      console.log('Migrated legacy snapshot store to multi-collection Mongo store.')
      storageMode = 'mongo'
      return true
    }

    db = buildSeedData({ timeZone: env.timezone })
    await saveStoreState(db)
    storageMode = 'mongo'
    return true
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(`Mongo store unavailable (${error.message}). Falling back to file store.`)
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect().catch(() => {})
    }
    return false
  }
}

async function initStore() {
  await fs.mkdir(env.dataDir, { recursive: true })
  await fs.mkdir(receiptDirPath, { recursive: true })
  await fs.mkdir(uploadDirPath, { recursive: true })

  const mongoReady = await initMongoStore()
  if (!mongoReady) {
    const exists = await fs
      .stat(dbPath)
      .then(() => true)
      .catch(() => false)

    if (!exists) {
      const seed = buildSeedData({ timeZone: env.timezone })
      await fs.writeFile(dbPath, JSON.stringify(seed, null, 2), 'utf8')
    }

    const content = await fs.readFile(dbPath, 'utf8')
    db = JSON.parse(content)
  }

  const shapeMigration = ensureDbShape(db)
  db = shapeMigration.db
  const mockCleanupChanged = stripMockSeedData(db)
  if (shapeMigration.changed || mockCleanupChanged) {
    await saveDb()
  }
}

function getDb() {
  if (!db) {
    throw new Error('Data store not initialized.')
  }
  return db
}

async function saveDb() {
  if (!db) {
    throw new Error('Data store not initialized.')
  }

  if (storageMode === 'mongo') {
    if (!mongoose.connection.db) {
      throw new Error('Mongo store is not connected.')
    }
    await saveStoreState(db)
    return
  }

  const tempPath = `${dbPath}.tmp`
  await fs.writeFile(tempPath, JSON.stringify(db, null, 2), 'utf8')
  await fs.rename(tempPath, dbPath)
}

async function closeStore() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect().catch(() => {})
  }
}

function getReceiptDirPath() {
  return receiptDirPath
}

function getUploadDirPath() {
  return uploadDirPath
}

function getStorageMode() {
  return storageMode
}

module.exports = {
  initStore,
  getDb,
  saveDb,
  closeStore,
  getStorageMode,
  getReceiptDirPath,
  getUploadDirPath,
}
