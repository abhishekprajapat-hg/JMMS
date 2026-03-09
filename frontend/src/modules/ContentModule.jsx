import { useEffect, useMemo, useState } from 'react'
import { apiRequest, toAbsoluteUrl } from '../services/api'
import { formatDate } from '../utils/validation'

const CONTENT_TYPES = ['ebook', 'video']
const MAX_CLIENT_UPLOAD_BYTES = 30 * 1024 * 1024
const MAX_CLIENT_COVER_BYTES = 8 * 1024 * 1024
const EBOOK_FILE_ACCEPT = 'application/pdf,.pdf'
const VIDEO_FILE_ACCEPT = 'video/*,.mp4,.webm,.ogg,.mov,.m4v'
const COVER_FILE_ACCEPT = 'image/*,.jpg,.jpeg,.png,.webp,.gif'

function getInitialForm() {
  return {
    type: 'ebook',
    title: '',
    description: '',
    url: '',
    thumbnailUrl: '',
    tags: '',
    sortOrder: 100,
    isPublished: true,
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const output = String(reader.result || '')
      const payload = output.includes(',') ? output.split(',')[1] : output
      resolve(payload)
    }
    reader.onerror = () => reject(new Error('Unable to read file.'))
    reader.readAsDataURL(file)
  })
}

function formatFileSize(sizeBytes) {
  const value = Number(sizeBytes) || 0
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(2)} MB`
  if (value >= 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${value} bytes`
}

function normalizeNameFromFile(fileName) {
  return String(fileName || '')
    .replace(/\.[^/.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function ContentModule({ authToken, onNotice }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingAsset, setUploadingAsset] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [editingId, setEditingId] = useState('')
  const [form, setForm] = useState(getInitialForm)

  const itemLookup = useMemo(
    () => Object.fromEntries(items.map((item) => [item.id, item])),
    [items],
  )

  async function loadContent() {
    if (!authToken) return
    setLoading(true)
    try {
      const response = await apiRequest('/content/library', {
        token: authToken,
      })
      setItems(response.items || [])
    } catch (error) {
      onNotice('error', error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadContent()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken])

  function applyItemToForm(item) {
    setForm({
      type: item.type || 'ebook',
      title: item.title || '',
      description: item.description || '',
      url: item.url || '',
      thumbnailUrl: item.thumbnailUrl || '',
      tags: (item.tags || []).join(', '),
      sortOrder: Number(item.sortOrder) || 100,
      isPublished: Boolean(item.isPublished),
    })
  }

  function resetForm() {
    setEditingId('')
    setForm(getInitialForm())
  }

  async function handleUploadFile(file) {
    if (!file) return
    if (file.size > MAX_CLIENT_UPLOAD_BYTES) {
      onNotice('error', 'File too large. Upload a file smaller than 30MB.')
      return
    }

    if (
      form.type === 'ebook' &&
      !String(file.type || '').includes('pdf') &&
      !String(file.name || '').toLowerCase().endsWith('.pdf')
    ) {
      onNotice('error', 'Ebook upload supports PDF files only.')
      return
    }

    if (form.type === 'video' && file.type && !String(file.type).startsWith('video/')) {
      onNotice('error', 'Please upload a valid video file.')
      return
    }

    setUploadingAsset(true)
    try {
      const data = await fileToBase64(file)
      const response = await apiRequest('/content/upload', {
        method: 'POST',
        token: authToken,
        timeoutMs: 90000,
        body: {
          type: form.type,
          fileName: file.name,
          mimeType: file.type || '',
          data,
        },
      })
      const uploadedUrl = response.url || ''
      const fallbackTitle = normalizeNameFromFile(file.name)
      setForm((current) => ({
        ...current,
        url: uploadedUrl || current.url,
        title: current.title || fallbackTitle,
      }))
      onNotice(
        'success',
        `Uploaded ${file.name} (${formatFileSize(response.file?.sizeBytes || file.size)}). URL field updated.`,
      )
    } catch (error) {
      onNotice('error', error.message)
    } finally {
      setUploadingAsset(false)
    }
  }

  async function handleUploadCover(file) {
    if (!file) return
    if (file.size > MAX_CLIENT_COVER_BYTES) {
      onNotice('error', 'Cover photo too large. Upload image smaller than 8MB.')
      return
    }
    if (file.type && !String(file.type).startsWith('image/')) {
      onNotice('error', 'Cover photo must be an image file.')
      return
    }

    setUploadingCover(true)
    try {
      const data = await fileToBase64(file)
      const response = await apiRequest('/content/upload-cover', {
        method: 'POST',
        token: authToken,
        timeoutMs: 60000,
        body: {
          fileName: file.name,
          mimeType: file.type || '',
          data,
        },
      })
      const uploadedUrl = response.url || ''
      setForm((current) => ({
        ...current,
        thumbnailUrl: uploadedUrl || current.thumbnailUrl,
      }))
      onNotice('success', `Cover uploaded (${formatFileSize(response.file?.sizeBytes || file.size)}).`)
    } catch (error) {
      onNotice('error', error.message)
    } finally {
      setUploadingCover(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!form.title || !form.url) {
      onNotice('error', 'Title and URL are required.')
      return
    }

    setSaving(true)
    try {
      const body = {
        type: form.type,
        title: form.title,
        description: form.description,
        url: form.url,
        thumbnailUrl: form.thumbnailUrl,
        tags: form.tags,
        sortOrder: Number(form.sortOrder || 100),
        isPublished: form.isPublished,
      }

      if (!editingId) {
        const response = await apiRequest('/content/library', {
          method: 'POST',
          token: authToken,
          body,
        })
        setItems((current) => [response.item, ...current])
        onNotice('success', `Content ${response.item.id} created.`)
      } else {
        const response = await apiRequest(`/content/library/${editingId}`, {
          method: 'PATCH',
          token: authToken,
          body,
        })
        setItems((current) => current.map((item) => (item.id === editingId ? response.item : item)))
        onNotice('success', `Content ${editingId} updated.`)
      }

      resetForm()
    } catch (error) {
      onNotice('error', error.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(itemId) {
    setSaving(true)
    try {
      await apiRequest(`/content/library/${itemId}`, {
        method: 'DELETE',
        token: authToken,
      })
      setItems((current) => current.filter((item) => item.id !== itemId))
      if (editingId === itemId) {
        resetForm()
      }
      onNotice('success', `Content ${itemId} removed.`)
    } catch (error) {
      onNotice('error', error.message)
    } finally {
      setSaving(false)
    }
  }

  async function togglePublish(itemId) {
    const target = itemLookup[itemId]
    if (!target) return
    setSaving(true)
    try {
      const response = await apiRequest(`/content/library/${itemId}`, {
        method: 'PATCH',
        token: authToken,
        body: { isPublished: !target.isPublished },
      })
      setItems((current) => current.map((item) => (item.id === itemId ? response.item : item)))
      onNotice('success', `${itemId} ${response.item.isPublished ? 'published' : 'unpublished'}.`)
    } catch (error) {
      onNotice('error', error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="panel-grid two-column">
      <article className="panel">
        <div className="panel-head">
          <h2>Main Website Content</h2>
          <p>Manage ebooks and videos shown on the public user website.</p>
        </div>

        <form className="stack-form" onSubmit={handleSubmit}>
          <h3>{editingId ? `Edit ${editingId}` : 'Create Content Item'}</h3>
          <label>
            Type
            <select
              value={form.type}
              onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
            >
              {CONTENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type === 'ebook' ? 'Ebook' : 'Video'}
                </option>
              ))}
            </select>
          </label>

          <label>
            Title
            <input
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            />
          </label>

          <label>
            URL (PDF/Drive/YouTube)
            <input
              value={form.url}
              onChange={(event) => setForm((current) => ({ ...current, url: event.target.value }))}
            />
          </label>

          <label>
            Upload {form.type === 'ebook' ? 'Ebook File' : 'Video File'} (optional)
            <input
              type="file"
              accept={form.type === 'ebook' ? EBOOK_FILE_ACCEPT : VIDEO_FILE_ACCEPT}
              onChange={async (event) => {
                const file = event.target.files?.[0] || null
                event.target.value = ''
                await handleUploadFile(file)
              }}
              disabled={loading || saving || uploadingAsset || uploadingCover}
            />
          </label>
          <p className="hint">
            {uploadingAsset
              ? 'Uploading file and generating URL...'
              : 'Select a file to upload directly. URL field will auto-fill after upload.'}
          </p>

          <label>
            Description
            <textarea
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            />
          </label>

          <label>
            Thumbnail URL (optional)
            <input
              value={form.thumbnailUrl}
              onChange={(event) => setForm((current) => ({ ...current, thumbnailUrl: event.target.value }))}
            />
          </label>

          <label>
            Upload Cover Photo (optional)
            <input
              type="file"
              accept={COVER_FILE_ACCEPT}
              onChange={async (event) => {
                const file = event.target.files?.[0] || null
                event.target.value = ''
                await handleUploadCover(file)
              }}
              disabled={loading || saving || uploadingAsset || uploadingCover}
            />
          </label>
          <p className="hint">
            {uploadingCover
              ? 'Uploading cover photo...'
              : 'Cover photo will be shown on the user website ebook cards.'}
          </p>

          {form.thumbnailUrl && (
            <div className="cover-preview-box">
              <img className="cover-preview-image" src={toAbsoluteUrl(form.thumbnailUrl)} alt="Cover preview" />
            </div>
          )}

          <label>
            Tags (comma separated)
            <input
              value={form.tags}
              onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
            />
          </label>

          <label>
            Sort Order
            <input
              type="number"
              min="0"
              value={form.sortOrder}
              onChange={(event) => setForm((current) => ({ ...current, sortOrder: event.target.value }))}
            />
          </label>

          <label className="inline-checkbox">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(event) => setForm((current) => ({ ...current, isPublished: event.target.checked }))}
            />
            Publish on website
          </label>

          <div className="action-row">
            <button type="submit" disabled={saving || loading || uploadingAsset || uploadingCover}>
              {editingId ? 'Update Content' : 'Create Content'}
            </button>
            {editingId && (
              <button
                type="button"
                className="secondary-btn"
                onClick={resetForm}
                disabled={saving || loading || uploadingAsset || uploadingCover}
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </article>

      <article className="panel">
        <div className="panel-head">
          <h2>Content Library</h2>
          <p>These items sync directly to your main-domain user website.</p>
        </div>

        <div className="table-wrap compact">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Type</th>
                <th>Title</th>
                <th>Status</th>
                <th>Order</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan="7">{loading ? 'Loading...' : 'No content items created yet.'}</td>
                </tr>
              )}
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.type}</td>
                  <td>{item.title}</td>
                  <td>{item.isPublished ? 'Published' : 'Draft'}</td>
                  <td>{item.sortOrder}</td>
                  <td>{formatDate(item.updatedAt)}</td>
                  <td className="table-actions-cell">
                    <div className="action-row table-action-row">
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={() => {
                          setEditingId(item.id)
                          applyItemToForm(item)
                        }}
                        disabled={saving}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={() => togglePublish(item.id)}
                        disabled={saving}
                      >
                        {item.isPublished ? 'Unpublish' : 'Publish'}
                      </button>
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={() => handleDelete(item.id)}
                        disabled={saving}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  )
}
