import * as WebBrowser from 'expo-web-browser'
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useEffect, useMemo, useState } from 'react'
import { MediaViewerModal } from '../components/MediaViewerModal'
import { ScreenShell } from '../components/ScreenShell'
import { SectionCard } from '../components/SectionCard'
import { SegmentedControl } from '../components/SegmentedControl'
import { UtilityBar } from '../components/UtilityBar'
import { loadFallbackBooks, loadFallbackVideos } from '../utils/contentFallbacks'
import { formatLocalizedNumber } from '../utils/i18n'
import { useApp } from '../context/AppContext'
import { getTheme } from '../theme'
import { PrimaryButton } from '../components/PrimaryButton'
import { FormField } from '../components/FormField'

const FALLBACK_BOOK_COVER = 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=700&q=80'
const FALLBACK_VIDEO_THUMBNAIL = 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=900&q=80'

function normalizeCategory(categoryText, fallbackValue) {
  const value = String(categoryText || '').trim()
  if (!value) return fallbackValue
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ')
}

export function LibraryScreen({ route }) {
  const {
    addWatchHistory,
    currentUser,
    darkMode,
    fetchLibrary,
    language,
    toggleDarkMode,
    toggleLanguage,
    toggleSavedEbook,
  } = useApp()
  const theme = getTheme(darkMode)
  const [mode, setMode] = useState(route.params?.initialMode === 'video' ? 'video' : 'ebook')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [notice, setNotice] = useState('')
  const [catalog, setCatalog] = useState({
    ebook: [],
    video: [],
  })
  const [loadedModes, setLoadedModes] = useState({
    ebook: false,
    video: false,
  })
  const [loading, setLoading] = useState(false)
  const [selectedVideo, setSelectedVideo] = useState(null)

  useEffect(() => {
    if (route.params?.initialMode === 'video' || route.params?.initialMode === 'ebook') {
      setMode(route.params.initialMode)
    }
  }, [route.params?.initialMode, route.params?.refreshKey])

  useEffect(() => {
    if (!notice) return undefined

    const timeout = setTimeout(() => setNotice(''), 2200)
    return () => clearTimeout(timeout)
  }, [notice])

  useEffect(() => {
    let active = true

    async function loadItems() {
      if (loadedModes[mode]) return
      setLoading(true)

      try {
        const items = await fetchLibrary(mode)
        if (!active) return

        if (items.length) {
          setCatalog((previous) => ({
            ...previous,
            [mode]: items.map((item) => ({
              ...item,
              category: normalizeCategory(item.category, mode === 'video' ? 'Pravachan' : 'Scripture'),
            })),
          }))
          return
        }

        const fallbackItems = mode === 'video'
          ? await loadFallbackVideos()
          : await loadFallbackBooks()

        if (!active) return

        setCatalog((previous) => ({
          ...previous,
          [mode]: fallbackItems.map((item) => ({
            ...item,
            category: normalizeCategory(item.category, mode === 'video' ? 'Pravachan' : 'Scripture'),
          })),
        }))
      } finally {
        if (active) {
          setLoading(false)
          setLoadedModes((previous) => ({
            ...previous,
            [mode]: true,
          }))
        }
      }
    }

    loadItems()

    return () => {
      active = false
    }
  }, [fetchLibrary, loadedModes, mode])

  const items = catalog[mode]

  const categories = useMemo(
    () => ['All', ...new Set(items.map((item) => item.category || (mode === 'video' ? 'Pravachan' : 'Scripture')))],
    [items, mode],
  )

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return items.filter((item) => {
      const categoryMatch = category === 'All' || item.category === category
      const queryMatch =
        !normalizedQuery ||
        [item.title, item.author, item.description, item.category]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery)
      return categoryMatch && queryMatch
    })
  }, [category, items, query])

  function handleSaveBook(bookId) {
    const result = toggleSavedEbook(bookId)
    setNotice(result.message)
  }

  function openVideo(video) {
    setSelectedVideo(video)
    addWatchHistory(video)
  }

  return (
    <ScreenShell
      description="Browse backend-fed ebooks and pravachan media with the same fallback catalog used on the website."
      eyebrow="Digital Library"
      headerContent={(
        <UtilityBar
          darkMode={darkMode}
          language={language}
          onToggleLanguage={toggleLanguage}
          onToggleTheme={toggleDarkMode}
          theme={theme}
        />
      )}
      theme={theme}
      title="Library"
    >
      <SectionCard style={styles.stackGap} theme={theme}>
        <SegmentedControl
          onSelect={(value) => {
            setMode(value)
            setCategory('All')
          }}
          options={[
            { label: 'Ebooks', value: 'ebook' },
            { label: 'Videos', value: 'video' },
          ]}
          selectedValue={mode}
          theme={theme}
        />

        <FormField
          label={mode === 'video' ? 'Find Pravachan' : 'Search Ebooks'}
          onChangeText={setQuery}
          placeholder={mode === 'video' ? 'Search videos by title or topic' : 'Search by title, author, or topic'}
          style={styles.fieldGap}
          theme={theme}
          value={query}
        />

        <Text style={[styles.resultText, { color: theme.colors.textMuted }]}>
          {loading
            ? `Loading ${mode === 'video' ? 'videos' : 'books'}...`
            : `${formatLocalizedNumber(filteredItems.length, language)} ${mode === 'video' ? 'items' : 'books'} found`}
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fieldGap}>
          {categories.map((item) => {
            const isSelected = item === category
            return (
              <Pressable
                key={item}
                onPress={() => setCategory(item)}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: isSelected ? theme.colors.accent : theme.colors.cardStrong,
                    borderColor: isSelected ? theme.colors.accent : theme.colors.border,
                  },
                ]}
              >
                <Text style={[styles.categoryText, { color: isSelected ? '#ffffff' : theme.colors.text }]}>
                  {item}
                </Text>
              </Pressable>
            )
          })}
        </ScrollView>

        {notice ? (
          <View style={[styles.notice, { backgroundColor: theme.colors.accentSurface, borderColor: theme.colors.borderStrong }]}>
            <Text style={[styles.noticeText, { color: theme.colors.text }]}>{notice}</Text>
          </View>
        ) : null}
      </SectionCard>

      {filteredItems.map((item) => (
        <SectionCard key={item.id} padded={false} style={styles.stackGap} theme={theme}>
          <Image
            source={{ uri: mode === 'video' ? item.thumbnailUrl || FALLBACK_VIDEO_THUMBNAIL : item.coverUrl || item.thumbnailUrl || FALLBACK_BOOK_COVER }}
            style={styles.mediaImage}
          />

          <View style={styles.mediaContent}>
            <Text style={[styles.mediaTitle, { color: theme.colors.text }]}>{item.title}</Text>
            <Text style={[styles.mediaMeta, { color: theme.colors.textMuted }]}>
              {mode === 'video' ? item.category : item.author || 'Jain Mandir Library'}
            </Text>
            <Text style={[styles.mediaBody, { color: theme.colors.textMuted }]}>{item.description}</Text>

            <View style={styles.actionRow}>
              {mode === 'video' ? (
                <PrimaryButton
                  onPress={() => openVideo(item)}
                  style={styles.actionButton}
                  theme={theme}
                  title="Watch Video"
                />
              ) : (
                <>
                  <PrimaryButton
                    onPress={() => WebBrowser.openBrowserAsync(item.readUrl || item.url)}
                    style={styles.actionButton}
                    theme={theme}
                    title="Read"
                  />
                  <PrimaryButton
                    onPress={() => WebBrowser.openBrowserAsync(item.downloadUrl || item.url)}
                    style={styles.actionButton}
                    theme={theme}
                    title="Download"
                    variant="secondary"
                  />
                  <PrimaryButton
                    onPress={() => handleSaveBook(item.id)}
                    style={styles.actionButton}
                    theme={theme}
                    title={currentUser?.savedEbookIds.includes(item.id) ? 'Saved' : 'Save'}
                    variant="ghost"
                  />
                </>
              )}
            </View>
          </View>
        </SectionCard>
      ))}

      <MediaViewerModal
        onClose={() => setSelectedVideo(null)}
        theme={theme}
        video={selectedVideo}
        visible={Boolean(selectedVideo)}
      />
    </ScreenShell>
  )
}

const styles = StyleSheet.create({
  stackGap: {
    marginTop: 18,
  },
  fieldGap: {
    marginTop: 16,
  },
  resultText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 16,
  },
  categoryChip: {
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '700',
  },
  notice: {
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  noticeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  mediaImage: {
    height: 210,
    width: '100%',
  },
  mediaContent: {
    padding: 18,
  },
  mediaTitle: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 26,
  },
  mediaMeta: {
    fontSize: 14,
    marginTop: 8,
  },
  mediaBody: {
    fontSize: 14,
    lineHeight: 22,
    marginTop: 12,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  actionButton: {
    minWidth: 96,
  },
})
