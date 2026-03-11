import { useEffect, useMemo, useState } from 'react'
import fallbackVideos from '../data/videos.json'
import { Card } from '../components/Card'
import { PageHeader } from '../components/PageHeader'
import { VideoPlayer } from '../components/VideoPlayer'
import { useApp } from '../context/AppContext'

const defaultThumbnail = 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=900&q=80'

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
  const { addWatchHistory, fetchLibrary } = useApp()

  useEffect(() => {
    let mounted = true
    fetchLibrary('video')
      .then((items) => {
        if (!mounted) return
        if (items.length) {
          setVideos(items.map((item) => ({ ...item, category: normalizeCategory(item.category) })))
        } else {
          setVideos(fallbackVideos)
        }
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [fetchLibrary])

  const categories = useMemo(
    () => ['All', ...new Set(videos.map((video) => video.category || 'Pravachan'))],
    [videos],
  )

  const filteredVideos = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return videos.filter((video) => {
      const categoryMatch = category === 'All' || (video.category || 'Pravachan') === category
      const queryMatch =
        !normalizedQuery ||
        [video.title, video.description, video.category].join(' ').toLowerCase().includes(normalizedQuery)
      return categoryMatch && queryMatch
    })
  }, [videos, query, category])

  function openVideo(video) {
    setSelectedVideo(video)
    addWatchHistory(video)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pravachan Library"
        title="Jain Video Library"
        description="Watch videos fetched from backend library endpoint with embedded YouTube player."
      />

      <Card className="space-y-4">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search videos by title or topic"
          className="focus-ring w-full rounded-xl border border-orange-200 bg-white px-4 py-2.5 text-sm dark:border-orange-900/40 dark:bg-zinc-900"
          aria-label="Search videos"
        />

        <div className="flex flex-wrap gap-2">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={`focus-ring rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-[0.1em] transition ${
                category === item
                  ? 'bg-orange-600 text-white'
                  : 'border border-orange-200 text-orange-800 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-200 dark:hover:bg-zinc-800'
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          {loading ? 'Loading videos...' : `${filteredVideos.length} videos found`}
        </p>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filteredVideos.map((video) => (
          <Card key={video.id} className="group flex flex-col overflow-hidden p-0">
            <button type="button" className="text-left" onClick={() => openVideo(video)}>
              <div className="relative overflow-hidden">
                <img
                  src={video.thumbnailUrl || defaultThumbnail}
                  alt={`${video.title} thumbnail`}
                  className="h-44 w-full object-cover transition duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <span className="absolute bottom-3 right-3 rounded-full bg-zinc-950/70 px-3 py-1 text-xs font-semibold text-white">
                  Play
                </span>
              </div>
            </button>
            <div className="flex flex-1 flex-col p-4">
              <span className="inline-flex w-fit rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-orange-700 dark:bg-orange-950/60 dark:text-orange-300">
                {video.category || 'Pravachan'}
              </span>
              <h2 className="mt-2 font-serif text-2xl text-orange-900 dark:text-orange-100">{video.title}</h2>
              <p className="mt-2 flex-1 text-sm text-zinc-600 dark:text-zinc-300">{video.description}</p>
              <button
                type="button"
                onClick={() => openVideo(video)}
                className="focus-ring mt-4 rounded-full bg-orange-600 px-4 py-2 text-xs font-bold text-white transition hover:brightness-105"
              >
                Watch Video
              </button>
            </div>
          </Card>
        ))}
      </div>

      <VideoPlayer
        video={selectedVideo}
        open={Boolean(selectedVideo)}
        onClose={() => setSelectedVideo(null)}
      />
    </div>
  )
}
