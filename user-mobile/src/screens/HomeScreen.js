import { LinearGradient } from 'expo-linear-gradient'
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useEffect, useMemo, useState } from 'react'
import { loadHomeFallbackContent } from '../utils/contentFallbacks'
import { formatLocalizedCurrency, formatLocalizedDate, formatLocalizedNumber } from '../utils/i18n'
import { getLocalPanchangForDate } from '../services/panchangService'
import { toAbsoluteUrl } from '../api/client'
import { PrimaryButton } from '../components/PrimaryButton'
import { ScreenShell } from '../components/ScreenShell'
import { SectionCard } from '../components/SectionCard'
import { UtilityBar } from '../components/UtilityBar'
import { useApp } from '../context/AppContext'
import { getTheme } from '../theme'

const EMPTY_HOME_FALLBACK_CONTENT = Object.freeze({
  announcements: [],
  books: [],
  festivals: [],
  videos: [],
})

const FALLBACK_BOOK_COVER = 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=900&q=80'
const FALLBACK_VIDEO_THUMBNAIL = 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=900&q=80'

function normalizeFeaturedBook(item) {
  return {
    id: item.id || item.title,
    title: item.title || 'Untitled',
    author: item.author || item.createdBy || 'Jain Mandir Library',
    category: item.category || (Array.isArray(item.tags) ? item.tags[0] : '') || 'Scripture',
    description: item.description || '',
    coverUrl: toAbsoluteUrl(item.coverUrl || item.thumbnailUrl || ''),
  }
}

function normalizeFeaturedVideo(item) {
  return {
    id: item.id || item.title,
    title: item.title || 'Untitled',
    category: item.category || (Array.isArray(item.tags) ? item.tags[0] : '') || 'Pravachan',
    description: item.description || '',
    thumbnailUrl: toAbsoluteUrl(item.thumbnailUrl || item.coverUrl || ''),
  }
}

function QuickLink({ theme, title, body, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.quickLink,
        {
          backgroundColor: theme.colors.cardStrong,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <Text style={[styles.quickLinkTitle, { color: theme.colors.text }]}>{title}</Text>
      <Text style={[styles.quickLinkBody, { color: theme.colors.textMuted }]}>{body}</Text>
    </Pressable>
  )
}

export function HomeScreen({ navigation }) {
  const {
    currentUser,
    darkMode,
    homeData,
    homeError,
    homeLoading,
    isAuthenticated,
    language,
    loadHomeData,
    mandirProfile,
    toggleDarkMode,
    toggleLanguage,
  } = useApp()
  const theme = getTheme(darkMode)
  const [fallbackContent, setFallbackContent] = useState(EMPTY_HOME_FALLBACK_CONTENT)

  useEffect(() => {
    let active = true

    loadHomeFallbackContent()
      .then((content) => {
        if (active) setFallbackContent(content)
      })
      .catch(() => {
        if (active) setFallbackContent(EMPTY_HOME_FALLBACK_CONTENT)
      })

    return () => {
      active = false
    }
  }, [])

  const upcomingFestivals = useMemo(() => {
    const fromBackend = Array.isArray(homeData?.upcomingEvents)
      ? homeData.upcomingEvents.map((event) => ({
          id: event.id,
          name: event.name,
          date: event.date,
          description: `${event.hall || 'Mandir Hall'}${Number(event.feePerFamily) ? ` | Fee: ${formatLocalizedCurrency(event.feePerFamily, language)}` : ''}`,
        }))
      : []

    if (fromBackend.length) return fromBackend.slice(0, 4)

    return [...fallbackContent.festivals]
      .sort((left, right) => new Date(left.date) - new Date(right.date))
      .slice(0, 4)
  }, [fallbackContent.festivals, homeData, language])

  const latestAnnouncements = useMemo(
    () => [...fallbackContent.announcements].sort((left, right) => new Date(right.date) - new Date(left.date)).slice(0, 4),
    [fallbackContent.announcements],
  )

  const donationSnapshot = useMemo(
    () => homeData?.donationSnapshot || {
      totalAmount: 0,
      donationCount: 0,
      supporterFamilies: 0,
    },
    [homeData],
  )

  const featuredBooks = useMemo(() => {
    const backendBooks = Array.isArray(homeData?.featured?.ebooks) ? homeData.featured.ebooks : []
    const source = backendBooks.length ? backendBooks : fallbackContent.books
    return source.slice(0, 2).map(normalizeFeaturedBook)
  }, [fallbackContent.books, homeData])

  const featuredVideos = useMemo(() => {
    const backendVideos = Array.isArray(homeData?.featured?.videos) ? homeData.featured.videos : []
    const source = backendVideos.length ? backendVideos : fallbackContent.videos
    return source.slice(0, 2).map(normalizeFeaturedVideo)
  }, [fallbackContent.videos, homeData])

  const todaysTithi = useMemo(() => getLocalPanchangForDate(new Date()), [])

  const mandirName = mandirProfile?.name || 'Jain Mandir'
  const devoteeName = currentUser?.name?.trim().split(/\s+/)[0] || ''
  const rootNavigation = navigation.getParent() || navigation

  return (
    <ScreenShell
      description="A quieter, clearer home for darshan, seva, study, and sangh life."
      eyebrow="Jain Dharma Digital Portal"
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
      title={mandirName}
    >
      <LinearGradient colors={theme.gradients.hero} style={styles.hero}>
        <Text style={styles.heroBadge}>
          {isAuthenticated && devoteeName ? `Welcome back, ${devoteeName}` : 'Open for every devotee'}
        </Text>
        <Text style={styles.heroTitle}>
          A calmer mobile home for seva, tithi, study, and community life.
        </Text>
        <Text style={styles.heroBody}>
          {mandirName} brings today&apos;s spiritual snapshot, transparent giving, upcoming observances, and library access into one devotional mobile experience.
        </Text>

        <View style={styles.heroActions}>
          <PrimaryButton
            onPress={() => navigation.navigate('Donate')}
            style={styles.heroButton}
            theme={theme}
            title="Donate for Seva"
          />
          <PrimaryButton
            onPress={() => navigation.navigate('Calendar')}
            style={styles.heroButton}
            theme={theme}
            title="Open Tithi Darpan"
            variant="secondary"
          />
        </View>

        <View style={styles.heroActions}>
          <PrimaryButton
            onPress={() => (isAuthenticated ? navigation.navigate('Profile') : rootNavigation.navigate('Signup'))}
            style={styles.heroButton}
            textStyle={{ color: '#ffffff' }}
            theme={theme}
            title={isAuthenticated ? 'Open Profile' : 'Join The Sangh'}
          />
          <PrimaryButton
            onPress={() => rootNavigation.navigate('About')}
            style={styles.heroButton}
            textStyle={{ color: '#ffffff' }}
            theme={theme}
            title="About Mandir"
            variant="ghost"
          />
        </View>
      </LinearGradient>

      {homeError ? (
        <SectionCard style={styles.stackGap} theme={theme}>
          <Text style={[styles.alertTitle, { color: theme.colors.danger }]}>Live homepage data could not be loaded.</Text>
          <Text style={[styles.alertBody, { color: theme.colors.textMuted }]}>{homeError}</Text>
          <PrimaryButton
            onPress={() => loadHomeData({ force: true })}
            style={styles.alertButton}
            theme={theme}
            title={homeLoading ? 'Refreshing...' : 'Retry'}
            variant="secondary"
          />
        </SectionCard>
      ) : null}

      <View style={styles.statGrid}>
        <SectionCard style={styles.statCard} theme={theme}>
          <Text style={[styles.statLabel, { color: theme.colors.accentStrong }]}>Total Donations</Text>
          <Text style={[styles.statValue, { color: theme.colors.text }]}>
            {formatLocalizedCurrency(donationSnapshot.totalAmount, language)}
          </Text>
        </SectionCard>
        <SectionCard style={styles.statCard} theme={theme}>
          <Text style={[styles.statLabel, { color: theme.colors.accentStrong }]}>Supporter Families</Text>
          <Text style={[styles.statValue, { color: theme.colors.text }]}>
            {formatLocalizedNumber(donationSnapshot.supporterFamilies, language)}
          </Text>
        </SectionCard>
        <SectionCard style={styles.statCard} theme={theme}>
          <Text style={[styles.statLabel, { color: theme.colors.accentStrong }]}>Festivals Ahead</Text>
          <Text style={[styles.statValue, { color: theme.colors.text }]}>
            {formatLocalizedNumber(upcomingFestivals.length, language)}
          </Text>
        </SectionCard>
      </View>

      <SectionCard style={styles.stackGap} theme={theme}>
        <Text style={[styles.sectionEyebrow, { color: theme.colors.accentStrong }]}>Today&apos;s Tithi</Text>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
          {todaysTithi.tithi} | {todaysTithi.lunarDate || todaysTithi.jainMonth}
        </Text>
        <Text style={[styles.cardBody, { color: theme.colors.textMuted }]}>
          {todaysTithi.auspiciousInfo}
        </Text>
        <View style={styles.tithiGrid}>
          <View style={styles.tithiItem}>
            <Text style={[styles.tithiLabel, { color: theme.colors.textSoft }]}>Nakshatra</Text>
            <Text style={[styles.tithiValue, { color: theme.colors.text }]}>{todaysTithi.nakshatra}</Text>
          </View>
          <View style={styles.tithiItem}>
            <Text style={[styles.tithiLabel, { color: theme.colors.textSoft }]}>Sunrise</Text>
            <Text style={[styles.tithiValue, { color: theme.colors.text }]}>{todaysTithi.sunrise}</Text>
          </View>
          <View style={styles.tithiItem}>
            <Text style={[styles.tithiLabel, { color: theme.colors.textSoft }]}>Sunset</Text>
            <Text style={[styles.tithiValue, { color: theme.colors.text }]}>{todaysTithi.sunset}</Text>
          </View>
          <View style={styles.tithiItem}>
            <Text style={[styles.tithiLabel, { color: theme.colors.textSoft }]}>Fasting</Text>
            <Text style={[styles.tithiValue, { color: theme.colors.text }]}>{todaysTithi.fasting || 'Regular observance'}</Text>
          </View>
        </View>
      </SectionCard>

      <SectionCard style={styles.stackGap} theme={theme}>
        <Text style={[styles.sectionEyebrow, { color: theme.colors.accentStrong }]}>Devotee Flow</Text>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
          Everything important stays close to the devotee journey.
        </Text>
        <View style={styles.quickLinkGrid}>
          <QuickLink
            body="Support temple seva with a cleaner and more transparent giving flow."
            onPress={() => navigation.navigate('Donate')}
            theme={theme}
            title="Donate"
          />
          <QuickLink
            body="Open scriptures, children&apos;s reading, and thoughtful Jain study from the library shelf."
            onPress={() => navigation.navigate('Library', { initialMode: 'ebook', refreshKey: Date.now() })}
            theme={theme}
            title="Ebooks"
          />
          <QuickLink
            body="Watch pravachan, bhajan, and darshan inside a calmer media experience."
            onPress={() => navigation.navigate('Library', { initialMode: 'video', refreshKey: Date.now() })}
            theme={theme}
            title="Videos"
          />
          <QuickLink
            body="Check tithi, fasting discipline, kalyanak, and upcoming observances."
            onPress={() => navigation.navigate('Calendar')}
            theme={theme}
            title="Tithi Darpan"
          />
        </View>
      </SectionCard>

      <SectionCard style={styles.stackGap} theme={theme}>
        <Text style={[styles.sectionEyebrow, { color: theme.colors.accentStrong }]}>Upcoming Observances</Text>
        {upcomingFestivals.map((event) => (
          <View key={event.id || `${event.name}-${event.date}`} style={styles.listItem}>
            <Text style={[styles.listTitle, { color: theme.colors.text }]}>{event.name}</Text>
            <Text style={[styles.listMeta, { color: theme.colors.textMuted }]}>
              {formatLocalizedDate(event.date, language, { day: '2-digit', month: 'short', year: 'numeric' })}
            </Text>
            <Text style={[styles.listBody, { color: theme.colors.textMuted }]}>{event.description}</Text>
          </View>
        ))}
      </SectionCard>

      <SectionCard style={styles.stackGap} theme={theme}>
        <Text style={[styles.sectionEyebrow, { color: theme.colors.accentStrong }]}>Announcements</Text>
        {latestAnnouncements.map((item) => (
          <View key={`${item.title}-${item.date}`} style={styles.listItem}>
            <Text style={[styles.listTitle, { color: theme.colors.text }]}>{item.title}</Text>
            <Text style={[styles.listMeta, { color: theme.colors.textMuted }]}>
              {formatLocalizedDate(item.date, language, { day: '2-digit', month: 'short', year: 'numeric' })}
            </Text>
            <Text style={[styles.listBody, { color: theme.colors.textMuted }]}>{item.description}</Text>
          </View>
        ))}
      </SectionCard>

      <SectionCard style={styles.stackGap} theme={theme}>
        <Text style={[styles.sectionEyebrow, { color: theme.colors.accentStrong }]}>Featured Shelf</Text>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Study, listen, and return whenever the day allows.</Text>

        <Text style={[styles.subSectionLabel, { color: theme.colors.textMuted }]}>Reading Shelf</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {featuredBooks.map((book) => (
            <View
              key={book.id}
              style={[
                styles.mediaCard,
                {
                  backgroundColor: theme.colors.cardStrong,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Image
                source={{ uri: book.coverUrl || FALLBACK_BOOK_COVER }}
                style={styles.mediaImage}
              />
              <Text numberOfLines={2} style={[styles.mediaTitle, { color: theme.colors.text }]}>
                {book.title}
              </Text>
              <Text numberOfLines={1} style={[styles.mediaMeta, { color: theme.colors.textMuted }]}>
                {book.author}
              </Text>
            </View>
          ))}
        </ScrollView>

        <Text style={[styles.subSectionLabel, { color: theme.colors.textMuted }]}>Pravachan Picks</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {featuredVideos.map((video) => (
            <View
              key={video.id}
              style={[
                styles.mediaCard,
                {
                  backgroundColor: theme.colors.cardStrong,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Image
                source={{ uri: video.thumbnailUrl || FALLBACK_VIDEO_THUMBNAIL }}
                style={styles.mediaImage}
              />
              <Text numberOfLines={2} style={[styles.mediaTitle, { color: theme.colors.text }]}>
                {video.title}
              </Text>
              <Text numberOfLines={1} style={[styles.mediaMeta, { color: theme.colors.textMuted }]}>
                {video.category}
              </Text>
            </View>
          ))}
        </ScrollView>
      </SectionCard>

      <SectionCard style={styles.stackGap} theme={theme}>
        <Text style={[styles.sectionEyebrow, { color: theme.colors.accentStrong }]}>Trust Desk</Text>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Trust details stay visible for confidence and transparency.</Text>
        <View style={styles.trustGrid}>
          <View style={styles.tithiItem}>
            <Text style={[styles.tithiLabel, { color: theme.colors.textSoft }]}>PAN</Text>
            <Text style={[styles.tithiValue, { color: theme.colors.text }]}>{mandirProfile?.pan || 'Available soon'}</Text>
          </View>
          <View style={styles.tithiItem}>
            <Text style={[styles.tithiLabel, { color: theme.colors.textSoft }]}>80G</Text>
            <Text style={[styles.tithiValue, { color: theme.colors.text }]}>{mandirProfile?.reg80G || 'Available soon'}</Text>
          </View>
          <View style={styles.tithiItem}>
            <Text style={[styles.tithiLabel, { color: theme.colors.textSoft }]}>Trust Number</Text>
            <Text style={[styles.tithiValue, { color: theme.colors.text }]}>{mandirProfile?.trustNumber || 'Available soon'}</Text>
          </View>
        </View>
      </SectionCard>
    </ScreenShell>
  )
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 32,
    marginTop: 18,
    marginBottom: 18,
    overflow: 'hidden',
    padding: 22,
  },
  heroBadge: {
    color: '#fff7ed',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 36,
    marginTop: 10,
  },
  heroBody: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 15,
    lineHeight: 24,
    marginTop: 12,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  heroButton: {
    flex: 1,
  },
  stackGap: {
    marginBottom: 18,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  alertBody: {
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
  },
  alertButton: {
    marginTop: 14,
  },
  statGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  statCard: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 10,
  },
  sectionEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 28,
    marginTop: 8,
  },
  cardBody: {
    fontSize: 15,
    lineHeight: 24,
    marginTop: 10,
  },
  tithiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 18,
  },
  tithiItem: {
    minWidth: '46%',
  },
  tithiLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  tithiValue: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    marginTop: 6,
  },
  quickLinkGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  quickLink: {
    borderRadius: 24,
    borderWidth: 1,
    minWidth: '47%',
    padding: 16,
  },
  quickLinkTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  quickLinkBody: {
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
  },
  listItem: {
    marginTop: 16,
  },
  listTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  listMeta: {
    fontSize: 13,
    marginTop: 5,
  },
  listBody: {
    fontSize: 14,
    lineHeight: 22,
    marginTop: 6,
  },
  subSectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 18,
    marginBottom: 12,
  },
  mediaCard: {
    borderRadius: 24,
    borderWidth: 1,
    marginRight: 12,
    overflow: 'hidden',
    paddingBottom: 14,
    width: 210,
  },
  mediaImage: {
    height: 140,
    width: '100%',
  },
  mediaTitle: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 20,
    marginTop: 12,
    paddingHorizontal: 14,
  },
  mediaMeta: {
    fontSize: 13,
    marginTop: 6,
    paddingHorizontal: 14,
  },
  trustGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 18,
  },
})
