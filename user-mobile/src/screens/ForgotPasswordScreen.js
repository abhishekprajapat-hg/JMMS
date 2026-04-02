import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useState } from 'react'
import { FormField } from '../components/FormField'
import { PrimaryButton } from '../components/PrimaryButton'
import { ScreenShell } from '../components/ScreenShell'
import { SectionCard } from '../components/SectionCard'
import { UtilityBar } from '../components/UtilityBar'
import { useApp } from '../context/AppContext'
import { getTheme } from '../theme'

export function ForgotPasswordScreen({ navigation }) {
  const { darkMode, language, requestPasswordReset, toggleDarkMode, toggleLanguage } = useApp()
  const theme = getTheme(darkMode)
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  function handleSubmit() {
    const result = requestPasswordReset(email)
    setMessage(result.message)
  }

  return (
    <ScreenShell
      description="The current backend does not expose a reset-password API, but this screen matches the website flow and guides users to support."
      eyebrow="Account Help"
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
      title="Forgot Password"
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
        <Text style={[styles.backText, { color: theme.colors.text }]}>Back</Text>
      </Pressable>

      <SectionCard style={styles.stackGap} theme={theme}>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Need help regaining access?</Text>
        <Text style={[styles.cardBody, { color: theme.colors.textMuted }]}>
          Enter your email and we will show the current support message from the shared app logic.
        </Text>

        <FormField
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          label="Email"
          onChangeText={setEmail}
          placeholder="priya@jainmandir.org"
          style={styles.fieldGap}
          theme={theme}
          value={email}
        />

        <PrimaryButton
          onPress={handleSubmit}
          style={styles.fieldGap}
          theme={theme}
          title="Request reset"
        />

        {message ? (
          <View style={[styles.notice, { backgroundColor: theme.colors.accentSurface, borderColor: theme.colors.borderStrong }]}>
            <Text style={[styles.noticeText, { color: theme.colors.text }]}>{message}</Text>
          </View>
        ) : null}
      </SectionCard>
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
  stackGap: {
    marginBottom: 18,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 28,
  },
  cardBody: {
    fontSize: 15,
    lineHeight: 24,
    marginTop: 10,
  },
  fieldGap: {
    marginTop: 16,
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
    lineHeight: 22,
  },
})
