const mongoose = require('mongoose')

const BASE_SCHEMA_OPTIONS = {
  strict: false,
  minimize: false,
  versionKey: false,
}

function toPascalCase(value) {
  return String(value || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

function getOrCreateModel(modelName, schema, collectionName) {
  return mongoose.models[modelName] || mongoose.model(modelName, schema, collectionName)
}

function stripMongoId(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return value
  }
  const cloned = { ...value }
  delete cloned._id
  return cloned
}

function ensureObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }
  return value
}

function createArrayModel(key, collectionName = key) {
  const modelName = `${toPascalCase(collectionName)}ArrayModel`
  const schema = new mongoose.Schema({}, {
    ...BASE_SCHEMA_OPTIONS,
    collection: collectionName,
  })
  const model = getOrCreateModel(modelName, schema, collectionName)

  async function load() {
    const documents = await model.find({}).lean()
    return documents.map((document) => stripMongoId(document))
  }

  async function save(source) {
    const items = Array.isArray(source) ? source : []
    const documents = items.map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return { value: item }
      }
      return stripMongoId(item)
    })

    await model.deleteMany({})
    if (documents.length) {
      await model.insertMany(documents)
    }
  }

  return Object.freeze({
    key,
    collectionName,
    kind: 'array',
    modelName,
    model,
    load,
    save,
  })
}

function createSingletonModel(key, collectionName = key, singletonId = 'singleton') {
  const modelName = `${toPascalCase(collectionName)}SingletonModel`
  const schema = new mongoose.Schema(
    {
      _id: { type: String, required: true },
    },
    {
      ...BASE_SCHEMA_OPTIONS,
      collection: collectionName,
    },
  )
  const model = getOrCreateModel(modelName, schema, collectionName)

  async function load() {
    const document = await model.findById(singletonId).lean()
    return document ? stripMongoId(document) : {}
  }

  async function save(source) {
    const payload = stripMongoId(ensureObject(source))
    await model.replaceOne(
      { _id: singletonId },
      {
        _id: singletonId,
        ...payload,
      },
      { upsert: true },
    )
  }

  return Object.freeze({
    key,
    collectionName,
    kind: 'singleton',
    singletonId,
    modelName,
    model,
    load,
    save,
  })
}

module.exports = {
  createArrayModel,
  createSingletonModel,
}
