import { LinearGradient } from 'expo-linear-gradient'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export function ScreenShell({
  theme,
  eyebrow,
  title,
  description,
  children,
  headerContent,
}) {
  return (
    <LinearGradient colors={theme.gradients.page} style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topRow}>
            <View
              style={[
                styles.brandPill,
                {
                  backgroundColor: theme.colors.cardStrong,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Text style={[styles.brandText, { color: theme.colors.accentStrong }]}>
                JMMS Mobile
              </Text>
            </View>

            {headerContent}
          </View>

          {eyebrow ? (
            <Text style={[styles.eyebrow, { color: theme.colors.accentStrong }]}>
              {eyebrow}
            </Text>
          ) : null}

          {title ? (
            <Text style={[styles.title, { color: theme.colors.text }]}>
              {title}
            </Text>
          ) : null}

          {description ? (
            <Text style={[styles.description, { color: theme.colors.textMuted }]}>
              {description}
            </Text>
          ) : null}

          {children}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    padding: 18,
    paddingBottom: 120,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  brandPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  brandText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.1,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.6,
    lineHeight: 36,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    marginTop: 10,
  },
})
