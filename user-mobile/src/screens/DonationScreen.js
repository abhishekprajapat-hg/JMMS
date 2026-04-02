import { Image, Linking, Modal, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useMemo, useState } from 'react'
import { FormField } from '../components/FormField'
import { PrimaryButton } from '../components/PrimaryButton'
import { ScreenShell } from '../components/ScreenShell'
import { SectionCard } from '../components/SectionCard'
import { SegmentedControl } from '../components/SegmentedControl'
import { UtilityBar } from '../components/UtilityBar'
import { useApp } from '../context/AppContext'
import { getTheme } from '../theme'
import { formatLocalizedCurrency, formatLocalizedDate } from '../utils/i18n'

export function DonationScreen({ navigation }) {
  const {
    addDonation,
    currentUser,
    darkMode,
    fundCategories,
    isAuthenticated,
    language,
    paymentGateways,
    paymentPortal,
    pendingPaymentIntents,
    submitDonationProof,
    toggleDarkMode,
    toggleLanguage,
    userDonations,
    working,
  } = useApp()
  const theme = getTheme(darkMode)
  const [amount, setAmount] = useState('')
  const [purpose, setPurpose] = useState(fundCategories[0] || 'General Fund')
  const [paymentMethod, setPaymentMethod] = useState('UPI')
  const [error, setError] = useState('')
  const [latestDonation, setLatestDonation] = useState(null)
  const [confirmationOpen, setConfirmationOpen] = useState(false)
  const [proofForm, setProofForm] = useState({
    payerName: currentUser?.name || '',
    payerUtr: '',
  })
  const [proofError, setProofError] = useState('')
  const [proofSuccess, setProofSuccess] = useState('')
  const rootNavigation = navigation.getParent() || navigation

  const donationHistoryPreview = useMemo(() => userDonations.slice(0, 5), [userDonations])

  async function handleDonationSubmit() {
    if (!isAuthenticated) {
      rootNavigation.navigate('Login')
      return
    }

    setError('')
    const result = await addDonation({
      amount,
      purpose,
      paymentMethod,
    })

    if (!result.ok) {
      setError(result.message)
      return
    }

    setLatestDonation(result.donation)
    setProofForm({
      payerName: currentUser?.name || '',
      payerUtr: '',
    })
    setProofError('')
    setProofSuccess('')
    setConfirmationOpen(true)
  }

  async function handleProofSubmit() {
    if (!latestDonation?.id) return

    const payerName = String(proofForm.payerName || '').trim()
    const payerUtr = String(proofForm.payerUtr || '').trim()

    setProofError('')
    setProofSuccess('')

    if (!payerName) {
      setProofError('Please enter payer name.')
      return
    }
    if (payerUtr.length < 8) {
      setProofError('Please enter a valid UTR / Transaction ID (minimum 8 characters).')
      return
    }

    const result = await submitDonationProof({
      paymentId: latestDonation.id,
      payerName,
      payerUtr,
    })

    if (!result.ok) {
      setProofError(result.message || 'Unable to submit payment proof right now.')
      return
    }

    setLatestDonation((current) => {
      if (!current) return current
      return {
        ...current,
        status: result.paymentIntent?.status || 'Proof Submitted',
        proofSubmitted: true,
      }
    })
    setProofSuccess('Proof submitted successfully. Team will verify your payment shortly.')
  }

  function closeConfirmation() {
    setConfirmationOpen(false)
    setLatestDonation(null)
    setProofError('')
    setProofSuccess('')
  }

  return (
    <ScreenShell
      description="Create payment intents directly with backend integration, choose your payment mode, and track contribution history through a cleaner mobile flow."
      eyebrow="Seva"
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
      title="Donation Portal"
    >
      {!isAuthenticated ? (
        <SectionCard style={styles.stackGap} theme={theme}>
          <Text style={[styles.cardBody, { color: theme.colors.textMuted }]}>
            Donation submission requires login to create payment intents linked with your family account.
          </Text>
          <PrimaryButton
            onPress={() => rootNavigation.navigate('Login')}
            style={styles.fieldGap}
            theme={theme}
            title="Login now"
          />
        </SectionCard>
      ) : null}

      <SectionCard style={styles.stackGap} theme={theme}>
        <Text style={[styles.sectionEyebrow, { color: theme.colors.accentStrong }]}>Contribution Flow</Text>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Make a Donation</Text>
        <Text style={[styles.cardBody, { color: theme.colors.textMuted }]}>
          This form creates a backend payment intent at `/api/user/payments/intents` and opens the same guided confirmation flow as the website.
        </Text>

        <FormField
          keyboardType="numeric"
          label="Amount (INR)"
          onChangeText={setAmount}
          placeholder="Enter donation amount"
          style={styles.fieldGap}
          theme={theme}
          value={amount}
        />

        <Text style={[styles.inputLabel, { color: theme.colors.textMuted }]}>Payment mode</Text>
        <SegmentedControl
          onSelect={setPaymentMethod}
          options={[
            { label: 'UPI', value: 'UPI' },
            { label: 'Bank Transfer', value: 'Bank Transfer' },
          ]}
          selectedValue={paymentMethod}
          theme={theme}
        />

        <Text style={[styles.inputLabel, { color: theme.colors.textMuted }]}>Purpose</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {fundCategories.map((item) => {
            const isSelected = item === purpose
            return (
              <PrimaryButton
                key={item}
                onPress={() => setPurpose(item)}
                style={styles.purposeButton}
                theme={theme}
                title={item}
                variant={isSelected ? 'primary' : 'secondary'}
              />
            )
          })}
        </ScrollView>

        {error ? (
          <View style={[styles.notice, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
            <Text style={styles.noticeText}>{error}</Text>
          </View>
        ) : null}

        <PrimaryButton
          disabled={working}
          onPress={handleDonationSubmit}
          style={styles.fieldGap}
          theme={theme}
          title={working ? 'Creating payment intent...' : 'Create payment intent'}
        />
      </SectionCard>

      <SectionCard style={styles.stackGap} theme={theme}>
        <Text style={[styles.sectionEyebrow, { color: theme.colors.accentStrong }]}>Payment Modes</Text>
        <Text style={[styles.cardBody, { color: theme.colors.textMuted }]}>
          Backend gateway modes: {paymentGateways.join(', ')}
        </Text>
        {paymentPortal?.upiVpa ? (
          <Text style={[styles.portalText, { color: theme.colors.accentStrong }]}>
            UPI VPA: {paymentPortal.upiVpa}
          </Text>
        ) : null}
        {pendingPaymentIntents.length > 0 ? (
          <Text style={[styles.cardBody, { color: theme.colors.textMuted }]}>
            Pending / submitted intents: {pendingPaymentIntents.length}
          </Text>
        ) : null}
      </SectionCard>

      <SectionCard style={styles.stackGap} theme={theme}>
        <Text style={[styles.sectionEyebrow, { color: theme.colors.accentStrong }]}>Recent Activity</Text>
        {donationHistoryPreview.length === 0 ? (
          <Text style={[styles.cardBody, { color: theme.colors.textMuted }]}>No donation records yet.</Text>
        ) : (
          donationHistoryPreview.map((donation) => (
            <View key={donation.id} style={styles.historyItem}>
              <View style={styles.historyText}>
                <Text style={[styles.historyTitle, { color: theme.colors.text }]}>{donation.purpose}</Text>
                <Text style={[styles.historyMeta, { color: theme.colors.textMuted }]}>
                  {formatLocalizedDate(donation.date, language, { day: '2-digit', month: 'short', year: 'numeric' })}
                </Text>
              </View>
              <Text style={[styles.historyAmount, { color: theme.colors.accentStrong }]}>
                {formatLocalizedCurrency(donation.amount, language)}
              </Text>
            </View>
          ))
        )}
      </SectionCard>

      <Modal animationType="slide" onRequestClose={closeConfirmation} visible={confirmationOpen}>
        <View style={[styles.modalWrap, { backgroundColor: theme.colors.background }]}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              {latestDonation?.proofSubmitted ? 'Donation Submitted' : 'Complete Your Donation'}
            </Text>
            <Text style={[styles.cardBody, { color: theme.colors.textMuted }]}>
              Payment intent created for {formatLocalizedCurrency(latestDonation?.amount, language)}.
            </Text>

            {latestDonation ? (
              <>
                <Text style={[styles.modalMeta, { color: theme.colors.textMuted }]}>
                  Purpose: {latestDonation.purpose}
                </Text>
                <Text style={[styles.modalMeta, { color: theme.colors.textMuted }]}>
                  Gateway: {latestDonation.paymentMethod}
                </Text>
                <Text style={[styles.modalMeta, { color: theme.colors.textMuted }]}>
                  Date: {formatLocalizedDate(latestDonation.date, language, { day: '2-digit', month: 'short', year: 'numeric' })}
                </Text>

                {latestDonation.instructions?.upiLink ? (
                  <SectionCard style={styles.stackGap} theme={theme}>
                    <Text style={[styles.sectionEyebrow, { color: theme.colors.accentStrong }]}>UPI Payment</Text>
                    <Text style={[styles.cardBody, { color: theme.colors.textMuted }]}>
                      Use your preferred UPI app to complete payment, then submit proof below.
                    </Text>
                    <PrimaryButton
                      onPress={() => Linking.openURL(latestDonation.instructions.upiLink).catch(() => {})}
                      style={styles.fieldGap}
                      theme={theme}
                      title="Open UPI app"
                    />
                    {latestDonation.instructions?.upiQrDataUrl ? (
                      <Image source={{ uri: latestDonation.instructions.upiQrDataUrl }} style={styles.qrImage} />
                    ) : null}
                    <Text style={[styles.linkText, { color: theme.colors.textMuted }]}>
                      {latestDonation.instructions.upiLink}
                    </Text>
                  </SectionCard>
                ) : null}

                {latestDonation.instructions?.bankTransfer ? (
                  <SectionCard style={styles.stackGap} theme={theme}>
                    <Text style={[styles.sectionEyebrow, { color: theme.colors.accentStrong }]}>Bank Transfer</Text>
                    <Text style={[styles.cardBody, { color: theme.colors.textMuted }]}>
                      {latestDonation.instructions.bankTransfer.payeeName}
                    </Text>
                    <Text style={[styles.modalMeta, { color: theme.colors.textMuted }]}>
                      {latestDonation.instructions.bankTransfer.bankName}
                    </Text>
                    <Text style={[styles.modalMeta, { color: theme.colors.textMuted }]}>
                      A/C: {latestDonation.instructions.bankTransfer.accountNumber}
                    </Text>
                    <Text style={[styles.modalMeta, { color: theme.colors.textMuted }]}>
                      IFSC: {latestDonation.instructions.bankTransfer.ifsc}
                    </Text>
                  </SectionCard>
                ) : null}

                <SectionCard style={styles.stackGap} theme={theme}>
                  <Text style={[styles.sectionEyebrow, { color: theme.colors.accentStrong }]}>Submit Proof of Payment</Text>
                  <Text style={[styles.cardBody, { color: theme.colors.textMuted }]}>
                    After payment, enter your payer name and UTR / transaction reference.
                  </Text>
                  <FormField
                    label="Payer Name"
                    onChangeText={(value) => setProofForm((current) => ({ ...current, payerName: value }))}
                    placeholder="Name used during payment"
                    style={styles.fieldGap}
                    theme={theme}
                    value={proofForm.payerName}
                  />
                  <FormField
                    autoCapitalize="characters"
                    autoCorrect={false}
                    label="UTR / Transaction ID"
                    onChangeText={(value) => setProofForm((current) => ({ ...current, payerUtr: value }))}
                    placeholder="Enter UTR or reference number"
                    style={styles.fieldGap}
                    theme={theme}
                    value={proofForm.payerUtr}
                  />

                  {proofError ? (
                    <View style={[styles.notice, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
                      <Text style={styles.noticeText}>{proofError}</Text>
                    </View>
                  ) : null}
                  {proofSuccess ? (
                    <View style={[styles.notice, { backgroundColor: '#ecfdf5', borderColor: '#bbf7d0' }]}>
                      <Text style={[styles.noticeText, { color: '#166534' }]}>{proofSuccess}</Text>
                    </View>
                  ) : null}

                  {!latestDonation.proofSubmitted ? (
                    <PrimaryButton
                      disabled={working}
                      onPress={handleProofSubmit}
                      style={styles.fieldGap}
                      theme={theme}
                      title={working ? 'Submitting proof...' : 'Submit proof'}
                    />
                  ) : null}
                </SectionCard>
              </>
            ) : null}

            <PrimaryButton
              onPress={closeConfirmation}
              style={styles.stackGap}
              theme={theme}
              title="Close"
              variant="secondary"
            />
          </ScrollView>
        </View>
      </Modal>
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
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  purposeButton: {
    marginRight: 10,
  },
  portalText: {
    fontSize: 13,
    fontWeight: '700',
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
  modalWrap: {
    flex: 1,
  },
  modalContent: {
    padding: 18,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 32,
  },
  modalMeta: {
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
  },
  qrImage: {
    alignSelf: 'center',
    height: 220,
    marginTop: 16,
    width: 220,
  },
  linkText: {
    fontSize: 12,
    lineHeight: 20,
    marginTop: 12,
  },
})
