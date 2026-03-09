const fs = require('node:fs/promises')
const path = require('node:path')
const { MongoClient } = require('mongodb')
const { env } = require('../config/env')
const { buildSeedData } = require('./seedData')
const { ensureDbShape } = require('./schema')

const DB_FILE = 'db.json'
const RECEIPT_DIR_NAME = 'receipts'
const UPLOAD_DIR_NAME = 'uploads'
const SNAPSHOT_COLLECTION = 'snapshots'
const SNAPSHOT_ID = 'jmms_main'

const dbPath = path.join(env.dataDir, DB_FILE)
const receiptDirPath = path.join(env.dataDir, RECEIPT_DIR_NAME)
const uploadDirPath = path.join(env.dataDir, UPLOAD_DIR_NAME)

let db = null
let storageMode = 'file'
let mongoClient = null
let mongoCollection = null

function getMongoDbName(uri) {
  try {
    const parsed = new URL(uri)
    const name = parsed.pathname.replace('/', '')
    return name || 'jmms'
  } catch (_error) {
    return 'jmms'
  }
}

async function initMongoStore() {
  if (!env.mongoUri) return false

  try {
    mongoClient = new MongoClient(env.mongoUri, {
      serverSelectionTimeoutMS: 3000,
    })
    await mongoClient.connect()

    const dbName = getMongoDbName(env.mongoUri)
    const mongoDb = mongoClient.db(dbName)
    mongoCollection = mongoDb.collection(SNAPSHOT_COLLECTION)

    let snapshot = await mongoCollection.findOne({ _id: SNAPSHOT_ID })
    if (!snapshot) {
      const seed = buildSeedData({ timeZone: env.timezone })
      snapshot = {
        _id: SNAPSHOT_ID,
        payload: seed,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      await mongoCollection.insertOne(snapshot)
    }

    db = snapshot.payload
    storageMode = 'mongo'
    return true
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(`Mongo store unavailable (${error.message}). Falling back to file store.`)
    if (mongoClient) {
      await mongoClient.close().catch(() => {})
    }
    mongoClient = null
    mongoCollection = null
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

  const migration = ensureDbShape(db)
  db = migration.db
  if (migration.changed) {
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
    await mongoCollection.updateOne(
      { _id: SNAPSHOT_ID },
      {
        $set: {
          payload: db,
          updatedAt: new Date().toISOString(),
        },
        $setOnInsert: {
          createdAt: new Date().toISOString(),
        },
      },
      { upsert: true },
    )
    return
  }

  const tempPath = `${dbPath}.tmp`
  await fs.writeFile(tempPath, JSON.stringify(db, null, 2), 'utf8')
  await fs.rename(tempPath, dbPath)
}

async function closeStore() {
  if (mongoClient) {
    await mongoClient.close().catch(() => {})
    mongoClient = null
    mongoCollection = null
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
