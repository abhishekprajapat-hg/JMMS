import { Modal } from './Modal'

export function VideoPlayer({ video, open, onClose }) {
  if (!video) return null
  const hasEmbed = Boolean(video.youtubeId)

  return (
    <Modal title={video.title} open={open} onClose={onClose}>
      <div className="space-y-3">
        {hasEmbed ? (
          <div className="overflow-hidden rounded-xl border border-orange-100 dark:border-orange-900/40">
            <iframe
              title={video.title}
              src={`https://www.youtube.com/embed/${video.youtubeId}`}
              className="aspect-video w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        ) : (
          <a
            href={video.url}
            target="_blank"
            rel="noreferrer"
            className="focus-ring inline-flex rounded-full bg-orange-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Open Video Link
          </a>
        )}
        <p className="text-sm text-zinc-600 dark:text-zinc-300">{video.description}</p>
      </div>
    </Modal>
  )
}
