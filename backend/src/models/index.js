const { mandirsModel } = require('./mandirsModel')
const { usersModel } = require('./usersModel')
const { devoteeUsersModel } = require('./devoteeUsersModel')
const { devoteeAffiliationsModel } = require('./devoteeAffiliationsModel')
const { deviceTokensModel } = require('./deviceTokensModel')
const { globalCalendarEntriesModel } = require('./globalCalendarEntriesModel')
const { familiesModel } = require('./familiesModel')
const { transactionsModel } = require('./transactionsModel')
const { paymentIntentsModel } = require('./paymentIntentsModel')
const { contentLibraryModel } = require('./contentLibraryModel')
const { expensesModel } = require('./expensesModel')
const { eventsModel } = require('./eventsModel')
const { eventRegistrationsModel } = require('./eventRegistrationsModel')
const { cancellationLogsModel } = require('./cancellationLogsModel')
const { assetsModel } = require('./assetsModel')
const { assetCheckoutsModel } = require('./assetCheckoutsModel')
const { poojaBookingsModel } = require('./poojaBookingsModel')
const { whatsappLogsModel } = require('./whatsappLogsModel')
const { approvalRequestsModel } = require('./approvalRequestsModel')
const { whatsAppRetryQueueModel } = require('./whatsAppRetryQueueModel')

const { mandirProfileModel } = require('./mandirProfileModel')
const { paymentPortalModel } = require('./paymentPortalModel')
const { whatsappConfigModel } = require('./whatsappConfigModel')
const { jobsModel } = require('./jobsModel')
const { authModel } = require('./authModel')
const { metaModel } = require('./metaModel')

const arrayModels = [
  mandirsModel,
  usersModel,
  devoteeUsersModel,
  devoteeAffiliationsModel,
  deviceTokensModel,
  globalCalendarEntriesModel,
  familiesModel,
  transactionsModel,
  paymentIntentsModel,
  contentLibraryModel,
  expensesModel,
  eventsModel,
  eventRegistrationsModel,
  cancellationLogsModel,
  assetsModel,
  assetCheckoutsModel,
  poojaBookingsModel,
  whatsappLogsModel,
  approvalRequestsModel,
  whatsAppRetryQueueModel,
]

const singletonModels = [
  mandirProfileModel,
  paymentPortalModel,
  whatsappConfigModel,
  jobsModel,
  authModel,
]

const mongoArrayCollectionKeys = arrayModels.map((model) => model.collectionName)
const mongoSingletonCollectionKeys = singletonModels.map((model) => model.collectionName)
const mongoSingletonId = 'singleton'

function hasObjectValues(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0)
}

async function loadStoreState() {
  const loaded = {}
  let hasData = false

  for (const modelDescriptor of arrayModels) {
    const documents = await modelDescriptor.load()
    if (documents.length > 0) {
      hasData = true
    }
    loaded[modelDescriptor.key] = documents
  }

  for (const modelDescriptor of singletonModels) {
    const document = await modelDescriptor.load()
    if (hasObjectValues(document)) {
      hasData = true
    }
    loaded[modelDescriptor.key] = document
  }

  const meta = await metaModel.load()
  if (hasObjectValues(meta)) {
    hasData = true
    if (Number.isFinite(Number(meta.version))) {
      loaded.version = Number(meta.version)
    }
    if (typeof meta.createdAt === 'string') {
      loaded.createdAt = meta.createdAt
    }
  }

  return { db: loaded, hasData }
}

async function saveStoreState(state) {
  const source = state && typeof state === 'object' ? state : {}

  for (const modelDescriptor of arrayModels) {
    await modelDescriptor.save(source[modelDescriptor.key])
  }

  for (const modelDescriptor of singletonModels) {
    await modelDescriptor.save(source[modelDescriptor.key])
  }

  const now = new Date().toISOString()
  await metaModel.save({
    version: Number.isFinite(Number(source.version)) ? Number(source.version) : 1,
    createdAt: typeof source.createdAt === 'string' ? source.createdAt : now,
    updatedAt: now,
  })
}

module.exports = {
  arrayModels,
  singletonModels,
  metaModel,
  mongoArrayCollectionKeys,
  mongoSingletonCollectionKeys,
  mongoSingletonId,
  loadStoreState,
  saveStoreState,
}

