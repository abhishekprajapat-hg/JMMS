import { Suspense, lazy, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Card } from '../components/Card'
import { PageHeader } from '../components/PageHeader'
import { useApp } from '../context/AppContext'
import { loadFallbackVideos } from '../utils/contentFallbacks'
import {
  formatLocalizedNumber,
  pickByLanguage,
  translateValue,
} from '../utils/i18n'

const defaultThumbnail = 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=900&q=80'
const VideoPlayer = lazy(() => import('../components/VideoPlayer').then((module) => ({ default: module.VideoPlayer })))

function normalizeCategory(categoryText) {
  const value = String(categoryText || '').trim()
  if (!value) return 'Pravachan'
  return value
    .split(/[-_\s]+/)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ')
}

export function VideosPage() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [selectedVideo, setSelectedVideo] = useState(null)
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const { addWatchHistory, fetchLibrary, language } = useApp()
  const deferredQuery = useDeferredValue(query)

  const copy = pickByLanguage(language, {
    en: {
      eyebrow: 'Pravachan Library',
      title: 'Jain Video Library',
      description: 'Watch backend-fed pravachan, bhakti, and spiritual media through a cleaner cinematic interface with embedded playback.',
      find: 'Find Pravachan',
      searchPlaceholder: 'Search videos by title or topic',
      searchAria: 'Search videos',
      loading: 'Loading videos...',
      found: (count) => `${formatLocalizedNumber(count, language)} videos found`,
      browse: 'Browse By Category',
      play: 'Play',
      watch: 'Watch Video',
      defaultCategory: 'Pravachan',
    },
    hi: {
      eyebrow: 'प्रवचन लाइब्रेरी',
      title: 'जैन वीडियो लाइब्रेरी',
      description: 'एम्बेडेड प्लेबैक के साथ अधिक साफ सिनेमैटिक इंटरफेस में प्रवचन, भक्ति और आध्यात्मिक मीडिया देखें।',
      find: 'प्रवचन खोजें',
      searchPlaceholder: 'शीर्षक या विषय से वीडियो खोजें',
      searchAria: 'वीडियो खोजें',
      loading: 'वीडियो लोड हो रहे हैं...',
      found: (count) => `${formatLocalizedNumber(count, language)} वीडियो मिले`,
      browse: 'श्रेणी के अनुसार देखें',
      play: 'चलाएँ',
      watch: 'वीडियो देखें',
      defaultCategory: 'Pravachan',
    },
  })

  useEffect(() => {
    let mounted = true
    const loadVideos = async () => {
      setLoading(true)
      try {
        const items = await fetchLibrary('video')
        if (!mounted) return

        if (items.length) {
          setVideos(items.map((item) => ({ ...item, category: normalizeCategory(item.category) })))
          return
        }

        const fallbackVideos = await loadFallbackVideos()
        if (mounted) {
          setVideos(fallbackVideos.map((item) => ({ ...item, category: normalizeCategory(item.category) })))
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadVideos()

    return () => {
      mounted = false
    }
  }, [fetchLibrary])

  const categories = useMemo(
    () => ['All', ...new Set(videos.map((video) => video.category || copy.defaultCategory))],
    [copy.defaultCategory, videos],
  )

  const filteredVideos = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase()
    return videos.filter((video) => {
      const categoryMatch = category === 'All' || (video.category || copy.defaultCategory) === category
      const queryMatch =
        !normalizedQuery ||
        [video.title, video.description, video.category].join(' ').toLowerCase().includes(normalizedQuery)
      return categoryMatch && queryMatch
    })
  }, [videos, deferredQuery, category, copy.defaultCategory])

  function openVideo(video) {
    setSelectedVideo(video)
    addWatchHistory(video)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
      />

      <Card className="space-y-6">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end xl:gap-6">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-700 dark:text-orange-300">{copy.find}</p>
            <div className="mt-3">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={copy.searchPlaceholder}
                className="focus-ring w-full rounded-[22px] border border-orange-200/80 bg-white/82 px-4 py-3 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] dark:border-orange-900/40 dark:bg-zinc-900/70"
                aria-label={copy.searchAria}
              />
            </div>
          </div>

          <div className="inline-flex w-fit items-center rounded-full border border-orange-200/70 bg-white/76 px-5 py-3 text-sm font-semibold text-zinc-600 shadow-[0_10px_20px_rgba(194,65,12,0.06)] dark:border-orange-900/30 dark:bg-white/5 dark:text-zinc-300">
            {loading ? copy.loading : copy.found(filteredVideos.length)}
          </div>
        </div>

        <div className="mt-3 rounded-[24px] border border-orange-200/70 bg-white/62 px-4 py-4 dark:border-orange-900/30 dark:bg-white/5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-700 dark:text-orange-300">{copy.browse}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`focus-ring rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] transition ${
                  category === item
                    ? 'bg-[linear-gradient(135deg,#c2410c,#f59e0b)] text-white shadow-[0_12px_20px_rgba(194,65,12,0.2)]'
                    : 'border border-orange-200/80 bg-white/80 text-orange-900 hover:bg-orange-50 dark:border-orange-900/40 dark:bg-white/5 dark:text-orange-200 dark:hover:bg-zinc-800'
                }`}
              >
                {translateValue(language, item)}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {filteredVideos.map((video) => (
          <Card key={video.id} className="group flex flex-col overflow-hidden p-0">
            <button type="button" className="text-left" onClick={() => openVideo(video)}>
              <div className="relative overflow-hidden">
                <img
                  src={video.thumbnailUrl || defaultThumbnail}
                  alt={`${video.title} thumbnail`}
                  className="h-56 w-full object-cover transition duration-500 group-hover:scale-105"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(28,20,14,0.84))]" />
                <span className="absolute left-4 top-4 inline-flex rounded-full border border-white/30 bg-black/30 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-white backdrop-blur-sm">
                  {translateValue(language, video.category || copy.defaultCategory)}
                </span>
                <span className="absolute bottom-4 right-4 rounded-full bg-white/90 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-orange-900 shadow-lg">
                  {copy.play}
                </span>
              </div>
            </button>
            <div className="flex flex-1 flex-col p-5">
              <h2 className="font-serif text-3xl text-orange-950 dark:text-amber-50">{video.title}</h2>
              <p className="mt-3 flex-1 text-sm leading-7 text-zinc-600 dark:text-zinc-300">{video.description}</p>
              <button
                type="button"
                onClick={() => openVideo(video)}
                className="focus-ring mt-5 rounded-full bg-[linear-gradient(135deg,#c2410c,#f59e0b)] px-4 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:brightness-105"
              >
                {copy.watch}
              </button>
            </div>
          </Card>
        ))}
      </div>

      <Suspense fallback={null}>
        <VideoPlayer
          video={selectedVideo}
          open={Boolean(selectedVideo)}
          onClose={() => setSelectedVideo(null)}
        />
      </Suspense>
    </div>
  )
}
