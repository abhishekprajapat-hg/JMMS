import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { ScreenShell } from '../components/ScreenShell'
import { SectionCard } from '../components/SectionCard'
import { UtilityBar } from '../components/UtilityBar'
import { useApp } from '../context/AppContext'
import { getTheme } from '../theme'

const sections = [
  {
    title: 'Our Vision',
    text: 'To nurture a spiritual ecosystem rooted in ahimsa, anekant, compassion, and disciplined daily practice.',
  },
  {
    title: 'Temple Activities',
    text: 'Daily aarti, pravachan sessions, pathshala for children, and festival seva drives through the year.',
  },
  {
    title: 'Community Programs',
    text: 'Health camps, youth volunteering, eco-friendly initiatives, and support for senior devotees.',
  },
  {
    title: 'Seva Timings',
    text: 'Morning Darshan: 6:00 AM - 11:00 AM | Evening Darshan: 5:00 PM - 9:00 PM',
  },
]

export function AboutScreen({ navigation }) {
  const { darkMode, language, toggleDarkMode, toggleLanguage } = useApp()
  const theme = getTheme(darkMode)

  return (
    <ScreenShell
      description="Learn about our spiritual values, daily activities, and community seva initiatives."
      eyebrow="Temple Information"
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
      title="About Mandir"
    >
      <Pressable
        onPress={() => navigation.goBack()}
        style={[
          styles.backButton,
          {
            backgroundColor: theme.colors.cardStrong,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <Text style={[styles.backText, { color: theme.colors.text }]}>Back to app</Text>
      </Pressable>

      <SectionCard padded={false} style={styles.heroCard} theme={theme}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1593693397690-362cb9666fc2?auto=format&fit=crop&w=1400&q=80' }}
          style={styles.heroImage}
        />
        <View style={[styles.heroOverlay, { backgroundColor: theme.colors.overlay }]}>
          <Text style={styles.heroEyebrow}>Mandir Essence</Text>
          <Text style={styles.heroTitle}>
            A space for prayer, reflection, and shared spiritual discipline.
          </Text>
        </View>
      </SectionCard>

      <SectionCard style={styles.stackGap} theme={theme}>
        <Text style={[styles.sectionEyebrow, { color: theme.colors.accentStrong }]}>
          Living Tradition
        </Text>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
          A mandir that balances ritual depth with community care.
        </Text>
        <Text style={[styles.cardBody, { color: theme.colors.textMuted }]}>
          Our space supports daily darshan, study, seva, and values-driven community programming for families, youth, and senior devotees alike.
        </Text>

        <View style={styles.timingGrid}>
          <View style={[styles.timingCard, { backgroundColor: theme.colors.cardStrong, borderColor: theme.colors.border }]}>
            <Text style={[styles.timingLabel, { color: theme.colors.accentStrong }]}>Morning Darshan</Text>
            <Text style={[styles.timingValue, { color: theme.colors.text }]}>6 AM</Text>
          </View>
          <View style={[styles.timingCard, { backgroundColor: theme.colors.cardStrong, borderColor: theme.colors.border }]}>
            <Text style={[styles.timingLabel, { color: theme.colors.accentStrong }]}>Evening Darshan</Text>
            <Text style={[styles.timingValue, { color: theme.colors.text }]}>5 PM</Text>
          </View>
        </View>
      </SectionCard>

      {sections.map((section, index) => (
        <SectionCard key={section.title} style={styles.stackGap} theme={theme}>
          <Text style={[styles.sectionEyebrow, { color: theme.colors.accentStrong }]}>
            0{index + 1}
          </Text>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{section.title}</Text>
          <Text style={[styles.cardBody, { color: theme.colors.textMuted }]}>{section.text}</Text>
        </SectionCard>
      ))}
    </ScreenShell>
  )
}

const styles = StyleSheet.create({
  backButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 18,
    marginBottom: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  backText: {
    fontSize: 13,
    fontWeight: '700',
  },
  heroCard: {
    marginBottom: 18,
    overflow: 'hidden',
  },
  heroImage: {
    height: 260,
    width: '100%',
  },
  heroOverlay: {
    inset: 0,
    justifyContent: 'flex-end',
    padding: 20,
    position: 'absolute',
  },
  heroEyebrow: {
    color: '#fed7aa',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 32,
    marginTop: 8,
  },
  stackGap: {
    marginBottom: 18,
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
  timingGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  timingCard: {
    borderRadius: 22,
    borderWidth: 1,
    flex: 1,
    padding: 14,
  },
  timingLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  timingValue: {
    fontSize: 28,
    fontWeight: '800',
    marginTop: 8,
  },
})
