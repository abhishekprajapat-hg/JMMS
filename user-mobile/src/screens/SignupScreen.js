import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useState } from 'react'
import { FormField } from '../components/FormField'
import { PrimaryButton } from '../components/PrimaryButton'
import { ScreenShell } from '../components/ScreenShell'
import { SectionCard } from '../components/SectionCard'
import { UtilityBar } from '../components/UtilityBar'
import { useApp } from '../context/AppContext'
import { getTheme } from '../theme'

export function SignupScreen({ navigation }) {
  const { darkMode, language, signup, toggleDarkMode, toggleLanguage, working } = useApp()
  const theme = getTheme(darkMode)
  const [form, setForm] = useState({
    fullName: '',
    gotra: '',
    whatsapp: '+91',
    address: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit() {
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (form.password !== form.confirmPassword) {
      setError('Password and confirm password do not match.')
      return
    }
    if (!/^\+91\d{10}$/.test(form.whatsapp.trim())) {
      setError('WhatsApp must be in +91XXXXXXXXXX format.')
      return
    }

    const result = await signup(form)
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
      description="Create your devotee account to manage donations, saved study material, and spiritual content."
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
      title="Signup"
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
        <Text style={[styles.sectionEyebrow, { color: theme.colors.accentStrong }]}>Join The Sangh</Text>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
          Create a profile that keeps seva, learning, and family details in one place.
        </Text>
        <Text style={[styles.cardBody, { color: theme.colors.textMuted }]}>
          Your account connects donations, library activity, and future mandir interactions to a single calm dashboard.
        </Text>
      </SectionCard>

      <SectionCard style={styles.stackGap} theme={theme}>
        <FormField label="Full Name" onChangeText={(value) => updateField('fullName', value)} theme={theme} value={form.fullName} />
        <FormField label="Gotra" onChangeText={(value) => updateField('gotra', value)} style={styles.fieldGap} theme={theme} value={form.gotra} />
        <FormField autoCapitalize="none" autoCorrect={false} keyboardType="email-address" label="Email" onChangeText={(value) => updateField('email', value)} style={styles.fieldGap} theme={theme} value={form.email} />
        <FormField autoCapitalize="none" autoCorrect={false} keyboardType="phone-pad" label="WhatsApp (+91...)" onChangeText={(value) => updateField('whatsapp', value)} style={styles.fieldGap} theme={theme} value={form.whatsapp} />
        <FormField label="Address" multiline onChangeText={(value) => updateField('address', value)} style={styles.fieldGap} theme={theme} value={form.address} />
        <FormField autoCapitalize="none" autoCorrect={false} label="Password" onChangeText={(value) => updateField('password', value)} secureTextEntry style={styles.fieldGap} theme={theme} value={form.password} />
        <FormField autoCapitalize="none" autoCorrect={false} label="Confirm Password" onChangeText={(value) => updateField('confirmPassword', value)} secureTextEntry style={styles.fieldGap} theme={theme} value={form.confirmPassword} />

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
          title={working ? 'Creating...' : 'Create Account'}
        />

        <View style={styles.linkRow}>
          <Text style={[styles.linkLabel, { color: theme.colors.textMuted }]}>Already registered?</Text>
          <Pressable onPress={() => navigation.navigate('Login')}>
            <Text style={[styles.linkText, { color: theme.colors.accentStrong }]}>Login</Text>
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
