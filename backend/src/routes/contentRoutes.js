const express = require('express')
const fs = require('node:fs/promises')
const path = require('node:path')
const { authorize } = require('../middleware/authorize')
const { getDb, saveDb, getUploadDirPath } = require('../store/db')
const { createId } = require('../utils/ids')
const { badRequest, notFound } = require('../utils/http')
const { ensureRequiredString } = require('../utils/validation')
const {
  CONTENT_TYPES,
  normalizeTags,
  ensureContentType,
  normalizeSortOrder,
  toContentList,
} = require('../services/contentService')
const { resolveMandirId, getRecordMandirId } = require('../services/tenantService')

const router = express.Router()
const MAX_UPLOAD_BYTES = 30 * 1024 * 1024
const COVER_MAX_UPLOAD_BYTES = 8 * 1024 * 1024
const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.ogg', '.mov', '.m4v'])
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif'])

function decodeBase64Payload(rawData, { maxBytes = MAX_UPLOAD_BYTES, label = 'File' } = {}) {
  const payload = ensureRequiredString(rawData).replace(/^data:[^;]+;base64,/, '')
  if (!payload) {
    throw badRequest('Upload payload is required.')
  }
  const buffer = Buffer.from(payload, 'base64')
  if (!buffer.length) {
    throw badRequest('Invalid upload payload.')
  }
  if (buffer.length > maxBytes) {
    throw badRequest(`${label} too large. Max size is ${Math.round(maxBytes / (1024 * 1024))}MB.`)
  }
  return buffer
}

function ensureUploadMimeType(type, mimeType) {
  const normalized = ensureRequiredString(mimeType).toLowerCase()
  if (!normalized) return normalized
  if (type === 'ebook' && !normalized.includes('pdf') && normalized !== 'application/octet-stream') {
    throw badRequest('Only PDF files are supported for ebooks.')
  }
  if (type === 'video' && !normalized.startsWith('video/')) {
    throw badRequest('Uploaded video must use a valid video MIME type.')
  }
  return normalized
}

function ensureCoverMimeType(mimeType) {
  const normalized = ensureRequiredString(mimeType).toLowerCase()
  if (!normalized) return normalized
  if (!normalized.startsWith('image/')) {
    throw badRequest('Cover photo must be an image file.')
  }
  return normalized
}

function resolveUploadExtension(type, rawFileName, mimeType) {
  const fileName = ensureRequiredString(rawFileName)
  const extFromName = path.extname(fileName).toLowerCase()
  if (type === 'ebook') {
    return extFromName === '.pdf' ? '.pdf' : '.pdf'
  }
  if (VIDEO_EXTENSIONS.has(extFromName)) {
    return extFromName
  }
  if (mimeType.includes('webm')) return '.webm'
  if (mimeType.includes('ogg')) return '.ogg'
  if (mimeType.includes('quicktime')) return '.mov'
  if (mimeType.includes('m4v')) return '.m4v'
  return '.mp4'
}

function resolveCoverExtension(rawFileName, mimeType) {
  const fileName = ensureRequiredString(rawFileName)
  const extFromName = path.extname(fileName).toLowerCase()
  if (IMAGE_EXTENSIONS.has(extFromName)) {
    return extFromName
  }
  if (mimeType.includes('png')) return '.png'
  if (mimeType.includes('webp')) return '.webp'
  if (mimeType.includes('gif')) return '.gif'
  return '.jpg'
}

router.get('/library', authorize('managePublicContent'), (req, res) => {
  const db = getDb()
  const type = ensureRequiredString(req.query?.type).toLowerCase()
  if (type && !CONTENT_TYPES.includes(type)) {
    throw badRequest('type must be ebook or video.')
  }
  const isSuperAdmin = req.user.role === 'super_admin'
  const mandirId = resolveMandirId(req, db)

  return res.json({
    items: toContentList(db, {
      includeUnpublished: true,
      type,
      mandirId,
      includeAllScopes: isSuperAdmin && ensureRequiredString(req.query?.scope).toLowerCase() === 'all',
    }),
  })
})

router.post('/library', authorize('managePublicContent'), async (req, res, next) => {
  try {
    const db = getDb()
    const type = ensureContentType(req.body?.type)
    const title = ensureRequiredString(req.body?.title)
    const url = ensureRequiredString(req.body?.url)
    const description = ensureRequiredString(req.body?.description)
    const thumbnailUrl = ensureRequiredString(req.body?.thumbnailUrl)
    const tags = normalizeTags(req.body?.tags)
    const isPublished = Boolean(req.body?.isPublished)
    const sortOrder = normalizeSortOrder(req.body?.sortOrder)
    const isSuperAdmin = req.user.role === 'super_admin'
    const requestedScope = ensureRequiredString(req.body?.scope).toLowerCase()
    const scope = isSuperAdmin && requestedScope === 'global' ? 'global' : 'mandir'
    const mandirId = scope === 'global' ? '' : resolveMandirId(req, db)

    if (!title || !url) {
      throw badRequest('title and url are required.')
    }

    const item = {
      id: createId('CNT'),
      type,
      title,
      description,
      url,
      thumbnailUrl,
      tags,
      scope,
      mandirId,
      isPublished,
      sortOrder,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: req.user.fullName,
      updatedBy: req.user.fullName,
    }

    db.contentLibrary.unshift(item)
    await saveDb()

    return res.status(201).json({ item })
  } catch (error) {
    return next(error)
  }
})

router.post('/upload', authorize('managePublicContent'), async (req, res, next) => {
  try {
    const db = getDb()
    const type = ensureContentType(req.body?.type)
    const fileName = ensureRequiredString(req.body?.fileName) || `${type}-upload`
    const mimeType = ensureUploadMimeType(type, req.body?.mimeType)
    const buffer = decodeBase64Payload(req.body?.data)
    const isSuperAdmin = req.user.role === 'super_admin'
    const requestedScope = ensureRequiredString(req.body?.scope).toLowerCase()
    const scope = isSuperAdmin && requestedScope === 'global' ? 'global' : 'mandir'
    const mandirId = scope === 'global' ? '' : resolveMandirId(req, db)

    const extension = resolveUploadExtension(type, fileName, mimeType)
    const folderParts = ['content', scope === 'global' ? 'global' : mandirId]
    const targetDir = path.join(getUploadDirPath(), ...folderParts)
    await fs.mkdir(targetDir, { recursive: true })

    const uploadedName = `${Date.now()}-${createId('UPL')}${extension}`
    const targetPath = path.join(targetDir, uploadedName)
    await fs.writeFile(targetPath, buffer)

    return res.status(201).json({
      url: `/uploads/${path.posix.join(...folderParts, uploadedName)}`,
      file: {
        name: fileName,
        mimeType: mimeType || (type === 'ebook' ? 'application/pdf' : 'video/mp4'),
        sizeBytes: buffer.length,
      },
      scope,
      mandirId,
    })
  } catch (error) {
    return next(error)
  }
})

router.post('/upload-cover', authorize('managePublicContent'), async (req, res, next) => {
  try {
    const db = getDb()
    const fileName = ensureRequiredString(req.body?.fileName) || 'cover-image'
    const mimeType = ensureCoverMimeType(req.body?.mimeType)
    const buffer = decodeBase64Payload(req.body?.data, {
      maxBytes: COVER_MAX_UPLOAD_BYTES,
      label: 'Cover photo',
    })
    const isSuperAdmin = req.user.role === 'super_admin'
    const requestedScope = ensureRequiredString(req.body?.scope).toLowerCase()
    const scope = isSuperAdmin && requestedScope === 'global' ? 'global' : 'mandir'
    const mandirId = scope === 'global' ? '' : resolveMandirId(req, db)

    const extension = resolveCoverExtension(fileName, mimeType)
    const folderParts = ['content', 'covers', scope === 'global' ? 'global' : mandirId]
    const targetDir = path.join(getUploadDirPath(), ...folderParts)
    await fs.mkdir(targetDir, { recursive: true })

    const uploadedName = `${Date.now()}-${createId('CVR')}${extension}`
    const targetPath = path.join(targetDir, uploadedName)
    await fs.writeFile(targetPath, buffer)

    return res.status(201).json({
      url: `/uploads/${path.posix.join(...folderParts, uploadedName)}`,
      file: {
        name: fileName,
        mimeType: mimeType || 'image/jpeg',
        sizeBytes: buffer.length,
      },
      scope,
      mandirId,
    })
  } catch (error) {
    return next(error)
  }
})

router.patch('/library/:contentId', authorize('managePublicContent'), async (req, res, next) => {
  try {
    const db = getDb()
    const item = (db.contentLibrary || []).find((entry) => entry.id === req.params.contentId)
    if (!item) {
      throw notFound('Content item not found.')
    }
    const isSuperAdmin = req.user.role === 'super_admin'
    const mandirId = resolveMandirId(req, db)
    if (!isSuperAdmin) {
      if (item.scope === 'global') {
        throw badRequest('Only super admin can modify global content.')
      }
      if (getRecordMandirId(item) !== mandirId) {
        throw badRequest('Content item belongs to another mandir.')
      }
    }

    if (req.body?.type !== undefined) {
      item.type = ensureContentType(req.body?.type)
    }

    if (req.body?.title !== undefined) {
      const title = ensureRequiredString(req.body?.title)
      if (!title) throw badRequest('title cannot be empty.')
      item.title = title
    }

    if (req.body?.url !== undefined) {
      const url = ensureRequiredString(req.body?.url)
      if (!url) throw badRequest('url cannot be empty.')
      item.url = url
    }

    if (req.body?.description !== undefined) {
      item.description = ensureRequiredString(req.body?.description)
    }

    if (req.body?.thumbnailUrl !== undefined) {
      item.thumbnailUrl = ensureRequiredString(req.body?.thumbnailUrl)
    }

    if (req.body?.tags !== undefined) {
      item.tags = normalizeTags(req.body?.tags)
    }

    if (req.body?.isPublished !== undefined) {
      item.isPublished = Boolean(req.body?.isPublished)
    }

    if (req.body?.sortOrder !== undefined) {
      item.sortOrder = normalizeSortOrder(req.body?.sortOrder, item.sortOrder)
    }
    if (req.body?.scope !== undefined && isSuperAdmin) {
      const scope = ensureRequiredString(req.body?.scope).toLowerCase()
      item.scope = scope === 'global' ? 'global' : 'mandir'
      item.mandirId = item.scope === 'global' ? '' : mandirId
    }

    item.updatedAt = new Date().toISOString()
    item.updatedBy = req.user.fullName
    await saveDb()

    return res.json({ item })
  } catch (error) {
    return next(error)
  }
})

router.delete('/library/:contentId', authorize('managePublicContent'), async (req, res, next) => {
  try {
    const db = getDb()
    const index = (db.contentLibrary || []).findIndex((entry) => entry.id === req.params.contentId)
    if (index < 0) {
      throw notFound('Content item not found.')
    }
    const item = db.contentLibrary[index]
    const isSuperAdmin = req.user.role === 'super_admin'
    const mandirId = resolveMandirId(req, db)
    if (!isSuperAdmin) {
      if (item.scope === 'global') {
        throw badRequest('Only super admin can delete global content.')
      }
      if (getRecordMandirId(item) !== mandirId) {
        throw badRequest('Content item belongs to another mandir.')
      }
    }

    const [removed] = db.contentLibrary.splice(index, 1)
    await saveDb()

    return res.json({ removedId: removed.id })
  } catch (error) {
    return next(error)
  }
})

module.exports = {
  contentRoutes: router,
}
