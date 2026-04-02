import { Pressable, StyleSheet, Text, View } from 'react-native'
import { FormField } from '../components/FormField'
import { PrimaryButton } from '../components/PrimaryButton'
import { ScreenShell } from '../components/ScreenShell'
import { SectionCard } from '../components/SectionCard'
import { UtilityBar } from '../components/UtilityBar'
import { useApp } from '../context/AppContext'
import { getTheme } from '../theme'
import { useState } from 'react'

export function LoginScreen({ navigation }) {
  const { darkMode, language, login, toggleDarkMode, toggleLanguage, working } = useApp()
  const theme = getTheme(darkMode)
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit() {
    const result = await login({ identifier, password })
    if (!result.ok) {
      setError(result.message)
      return
    }

    if (navigation.canGoBack()) {
      navigation.goBack()
      return
    }

    navigation.replace('Root')
  }

  return (
    <ScreenShell
      description="Use email, WhatsApp (+91...), or Family ID to access your profile dashboard."
      eyebrow="Authentication"
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
      title="Login"
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
        <Text style={[styles.sectionEyebrow, { color: theme.colors.accentStrong }]}>Welcome Back</Text>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
          Return to your mandir dashboard with calm, not friction.
        </Text>
        <Text style={[styles.cardBody, { color: theme.colors.textMuted }]}>
          Track donations, revisit saved books, continue spiritual learning, and stay close to your sangh account.
        </Text>
      </SectionCard>

      <SectionCard style={styles.stackGap} theme={theme}>
        <FormField
          autoCapitalize="none"
          autoCorrect={false}
          label="Email / WhatsApp / Family ID"
          onChangeText={setIdentifier}
          placeholder="priya@jainmandir.org or +919876543210 or FAM-0001"
          theme={theme}
          value={identifier}
        />

        <FormField
          autoCapitalize="none"
          autoCorrect={false}
          label="Password"
          onChangeText={setPassword}
          placeholder="Enter password"
          secureTextEntry
          style={styles.fieldGap}
          theme={theme}
          value={password}
        />

        {error ? (
          <View style={[styles.notice, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
            <Text style={styles.noticeText}>{error}</Text>
          </View>
        ) : null}

        <PrimaryButton
          disabled={working}
          onPress={handleSubmit}
          style={styles.fieldGap}
          theme={theme}
          title={working ? 'Signing In...' : 'Login'}
        />

        <View style={styles.linkRow}>
          <Text style={[styles.linkLabel, { color: theme.colors.textMuted }]}>New user?</Text>
          <Pressable onPress={() => navigation.navigate('Signup')}>
            <Text style={[styles.linkText, { color: theme.colors.accentStrong }]}>Signup</Text>
          </Pressable>
        </View>

        <View style={styles.linkRow}>
          <Text style={[styles.linkLabel, { color: theme.colors.textMuted }]}>Forgot password?</Text>
          <Pressable onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={[styles.linkText, { color: theme.colors.accentStrong }]}>Reset here</Text>
          </Pressable>
        </View>
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
    color: '#b91c1c',
    fontSize: 14,
    fontWeight: '700',
  },
  linkRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 14,
  },
  linkLabel: {
    fontSize: 14,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '700',
  },
})
