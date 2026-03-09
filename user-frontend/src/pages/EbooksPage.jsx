import { LibraryPage } from './LibraryPage'

export function EbooksPage() {
  return (
    <LibraryPage
      type="ebook"
      title="Ebooks"
      subtitle="Read shastras, puja text, and mandir-published digital books."
      emptyMessage="No ebooks published for this mandir."
    />
  )
}
