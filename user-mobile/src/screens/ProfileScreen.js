import * as WebBrowser from 'expo-web-browser'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useEffect, useMemo, useState } from 'react'
import { PrimaryButton } from '../components/PrimaryButton'
import { ScreenShell } from '../components/ScreenShell'
import { SectionCard } from '../components/SectionCard'
import { UtilityBar } from '../components/UtilityBar'
import { useApp } from '../context/AppContext'
import { getTheme } from '../theme'
import { formatLocalizedCurrency, formatLocalizedDate } from '../utils/i18n'
import { toAbsoluteUrl } from '../api/client'

export function ProfileScreen({ navigation }) {
  const {
    currentUser,
    darkMode,
    fetchLibrary,
    isAuthenticated,
    language,
    logout,
    refreshUserData,
    toggleDarkMode,
    toggleLanguage,
    totalDonations,
    userData,
    userDonations,
  } = useApp()
  const theme = getTheme(darkMode)
  const [ebookCatalog, setEbookCatalog] = useState([])

  useEffect(() => {
    let active = true

    if (!isAuthenticated) {
      setEbookCatalog([])
      return undefined
    }

    fetchLibrary('ebook').then((items) => {
      if (active) setEbookCatalog(items)
    })

    return () => {
      active = false
    }
  }, [fetchLibrary, isAuthenticated])

  const savedBooks = useMemo(
    () => ebookCatalog.filter((book) => currentUser?.savedEbookIds.includes(book.id)),
    [ebookCatalog, currentUser],
  )

  const family = userData?.family || userData?.summary?.family || null
  const receipts = useMemo(() => userData?.summary?.receipts || [], [userData])
  const sortedReceipts = useMemo(
    () => [...receipts].sort((left, right) => String(right.paidAt || '').localeCompare(String(left.paidAt || ''))),
    [receipts],
  )
  const rootNavigation = navigation.getParent() || navigation

  if (!isAuthenticated) {
    return (
      <ScreenShell
        description="Login is required to view donations, receipts, saved books, and watch activity."
        eyebrow="Dashboard"
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
        title="User Profile"
      >
        <SectionCard style={styles.stackGap} theme={theme}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
            Your devotee dashboard opens after login.
          </Text>
          <Text style={[styles.cardBody, { color: theme.colors.textMuted }]}>
            Sign in to see donations, saved reading, watch history, and receipt downloads linked to your family account.
          </Text>
          <View style={styles.actionRow}>
            <PrimaryButton
              onPress={() => rootNavigation.navigate('Login')}
              style={styles.actionButton}
              theme={theme}
              title="Login"
            />
            <PrimaryButton
              onPress={() => rootNavigation.navigate('Signup')}
              style={styles.actionButton}
              theme={theme}
              title="Signup"
              variant="secondary"
            />
          </View>
        </SectionCard>
      </ScreenShell>
    )
  }

  return (
    <ScreenShell
      description="Your profile details, total donations, history, saved reading, and watch activity in one richer dashboard."
      eyebrow="Dashboard"
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
      title="User Profile"
    >
      <SectionCard style={styles.stackGap} theme={theme}>
        <View style={styles.actionRow}>
          <PrimaryButton
            onPress={() => refreshUserData(undefined, { silent: true })}
            style={styles.actionButton}
            theme={theme}
            title="Refresh"
            variant="secondary"
          />
          <PrimaryButton
            onPress={logout}
            style={styles.actionButton}
            theme={theme}
            title="Logout"
            variant="ghost"
          />
        </View>

        <Text style={[styles.sectionEyebrow, { color: theme.colors.accentStrong }]}>Profile Details</Text>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{currentUser?.name || 'Devotee Account'}</Text>

        <View style={styles.detailGrid}>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: theme.colors.textSoft }]}>Email</Text>
            <Text style={[styles.detailValue, { color: theme.colors.text }]}>{currentUser?.email || '-'}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: theme.colors.textSoft }]}>WhatsApp</Text>
            <Text style={[styles.detailValue, { color: theme.colors.text }]}>{currentUser?.phone || '-'}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: theme.colors.textSoft }]}>Family ID</Text>
            <Text style={[styles.detailValue, { color: theme.colors.text }]}>{currentUser?.familyId || family?.familyId || '-'}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: theme.colors.textSoft }]}>Gotra</Text>
            <Text style={[styles.detailValue, { color: theme.colors.text }]}>{family?.gotra || '-'}</Text>
          </View>
        </View>
      </SectionCard>

      <SectionCard
        style={[
          styles.stackGap,
          styles.totalCard,
          {
            backgroundColor: theme.colors.accent,
            borderColor: theme.colors.accent,
          },
        ]}
        theme={theme}
      >
        <Text style={styles.totalEyebrow}>Lifetime Seva</Text>
        <Text style={styles.totalTitle}>Total Donations</Text>
        <Text style={styles.totalValue}>{formatLocalizedCurrency(totalDonations, language)}</Text>
        <Text style={styles.totalBody}>
          A single view of your paid contributions and devotional support for mandir activities.
        </Text>
      </SectionCard>

      <SectionCard style={styles.stackGap} theme={theme}>
        <Text style={[styles.sectionEyebrow, { color: theme.colors.accentStrong }]}>Donation History</Text>
        {userDonations.length === 0 ? (
          <Text style={[styles.cardBody, { color: theme.colors.textMuted }]}>No donations recorded yet.</Text>
        ) : (
          userDonations.map((donation) => (
            <View key={donation.id} style={styles.historyItem}>
              <View style={styles.historyText}>
                <Text style={[styles.historyTitle, { color: theme.colors.text }]}>{donation.purpose}</Text>
                <Text style={[styles.historyMeta, { color: theme.colors.textMuted }]}>
                  {formatLocalizedDate(donation.date, language, { day: '2-digit', month: 'short', year: 'numeric' })} | {donation.status}
                </Text>
              </View>
              <Text style={[styles.historyAmount, { color: theme.colors.accentStrong }]}>
                {formatLocalizedCurrency(donation.amount, language)}
              </Text>
            </View>
          ))
        )}
      </SectionCard>

      <SectionCard style={styles.stackGap} theme={theme}>
        <Text style={[styles.sectionEyebrow, { color: theme.colors.accentStrong }]}>Saved Ebooks</Text>
        {savedBooks.length === 0 ? (
          <Text style={[styles.cardBody, { color: theme.colors.textMuted }]}>No saved books yet.</Text>
        ) : (
          savedBooks.map((book) => (
            <Pressable
              key={book.id}
              onPress={() => WebBrowser.openBrowserAsync(book.readUrl || book.url)}
              style={styles.historyItem}
            >
              <View style={styles.historyText}>
                <Text style={[styles.historyTitle, { color: theme.colors.text }]}>{book.title}</Text>
                <Text style={[styles.historyMeta, { color: theme.colors.textMuted }]}>{book.author}</Text>
              </View>
              <Text style={[styles.historyAmount, { color: theme.colors.accentStrong }]}>Read</Text>
            </Pressable>
          ))
        )}
      </SectionCard>

      <SectionCard style={styles.stackGap} theme={theme}>
        <Text style={[styles.sectionEyebrow, { color: theme.colors.accentStrong }]}>Watch History</Text>
        {!currentUser?.watchHistory?.length ? (
          <Text style={[styles.cardBody, { color: theme.colors.textMuted }]}>No watch history yet.</Text>
        ) : (
          currentUser.watchHistory.slice(0, 8).map((entry) => (
            <View key={`${entry.videoId}-${entry.watchedAt}`} style={styles.historyItem}>
              <View style={styles.historyText}>
                <Text style={[styles.historyTitle, { color: theme.colors.text }]}>{entry.title}</Text>
                <Text style={[styles.historyMeta, { color: theme.colors.textMuted }]}>
                  Watched on {formatLocalizedDate(entry.watchedAt, language, { day: '2-digit', month: 'short', year: 'numeric' })}
                </Text>
              </View>
            </View>
          ))
        )}
      </SectionCard>

      <SectionCard style={styles.stackGap} theme={theme}>
        <Text style={[styles.sectionEyebrow, { color: theme.colors.accentStrong }]}>Receipts</Text>
        {sortedReceipts.length === 0 ? (
          <Text style={[styles.cardBody, { color: theme.colors.textMuted }]}>No receipt entries available yet.</Text>
        ) : (
          sortedReceipts.map((receipt) => {
            const receiptUrl = toAbsoluteUrl(receipt.receiptPath)

            return (
              <View key={receipt.transactionId} style={styles.receiptItem}>
                <View style={styles.historyText}>
                  <Text style={[styles.historyTitle, { color: theme.colors.text }]}>
                    {receipt.receiptNumber || receipt.transactionId}
                  </Text>
                  <Text style={[styles.historyMeta, { color: theme.colors.textMuted }]}>
                    {formatLocalizedDate(receipt.paidAt, language, { day: '2-digit', month: 'short', year: 'numeric' })} | {formatLocalizedCurrency(receipt.amount, language)}
                  </Text>
                  <Text style={[styles.historyMeta, { color: theme.colors.textMuted }]}>
                    Receipt for {receipt.fundCategory || '-'}
                  </Text>
                </View>

                {receiptUrl ? (
                  <PrimaryButton
                    onPress={() => WebBrowser.openBrowserAsync(receiptUrl)}
                    style={styles.receiptButton}
                    theme={theme}
                    title="View Receipt"
                    variant="secondary"
                  />
                ) : null}
              </View>
            )
          })
        )}
      </SectionCard>
    </ScreenShell>
  )
}

const styles = StyleSheet.create({
  stackGap: {
    marginTop: 18,
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
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
  },
  sectionEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 18,
  },
  detailItem: {
    minWidth: '46%',
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    marginTop: 6,
  },
  totalCard: {
    overflow: 'hidden',
  },
  totalEyebrow: {
    color: '#ffedd5',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  totalTitle: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 8,
  },
  totalValue: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: '800',
    marginTop: 18,
  },
  totalBody: {
    color: '#ffedd5',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 10,
  },
  historyItem: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginTop: 16,
  },
  historyText: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  historyMeta: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 5,
  },
  historyAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
  receiptItem: {
    marginTop: 16,
  },
  receiptButton: {
    marginTop: 12,
  },
})
