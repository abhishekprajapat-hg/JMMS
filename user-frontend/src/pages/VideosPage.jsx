import { LibraryPage } from './LibraryPage'

export function VideosPage() {
  return (
    <LibraryPage
      type="video"
      title="Videos"
      subtitle="Watch pravachans, dharmik sessions, and mandir video content."
      emptyMessage="No videos published for this mandir."
    />
  )
}
