import announcements from '../data/announcements.json'
import books from '../data/books.json'
import festivals from '../data/festivals.json'
import videos from '../data/videos.json'

const EMPTY_ARRAY = []

function toArray(value) {
  return Array.isArray(value) ? value : EMPTY_ARRAY
}

export async function loadFallbackBooks() {
  return toArray(books)
}

export async function loadFallbackVideos() {
  return toArray(videos)
}

export async function loadFallbackFestivals() {
  return toArray(festivals)
}

export async function loadFallbackAnnouncements() {
  return toArray(announcements)
}

export async function loadHomeFallbackContent() {
  return {
    announcements: toArray(announcements),
    books: toArray(books),
    festivals: toArray(festivals),
    videos: toArray(videos),
  }
}
