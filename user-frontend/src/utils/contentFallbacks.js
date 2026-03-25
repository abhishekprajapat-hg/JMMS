const EMPTY_ARRAY = []

async function loadJsonArray(loader) {
  const module = await loader()
  return Array.isArray(module.default) ? module.default : EMPTY_ARRAY
}

export async function loadFallbackBooks() {
  return loadJsonArray(() => import('../data/books.json'))
}

export async function loadFallbackVideos() {
  return loadJsonArray(() => import('../data/videos.json'))
}

export async function loadFallbackFestivals() {
  return loadJsonArray(() => import('../data/festivals.json'))
}

export async function loadFallbackAnnouncements() {
  return loadJsonArray(() => import('../data/announcements.json'))
}

export async function loadHomeFallbackContent() {
  const [announcements, books, festivals, videos] = await Promise.all([
    loadFallbackAnnouncements(),
    loadFallbackBooks(),
    loadFallbackFestivals(),
    loadFallbackVideos(),
  ])

  return {
    announcements,
    books,
    festivals,
    videos,
  }
}
