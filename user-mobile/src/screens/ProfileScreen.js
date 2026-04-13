import * as WebBrowser from 'expo-web-browser'
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useEffect, useMemo, useState } from 'react'
import { FormField } from '../components/FormField'
import { PrimaryButton } from '../components/PrimaryButton'
import { ScreenShell } from '../components/ScreenShell'
import { SectionCard } from '../components/SectionCard'
import { UtilityBar } from '../components/UtilityBar'
import { useApp } from '../context/AppContext'
import { getTheme } from '../theme'
import { formatLocalizedCurrency, formatLocalizedDate } from '../utils/i18n'
import { toAbsoluteUrl } from '../api/client'

const upiAppOptions = [
  { id: 'any', label: 'Any UPI App' },
  { id: 'gpay', label: 'Google Pay' },
  { id: 'phonepe', label: 'PhonePe' },
  { id: 'paytm', label: 'Paytm' },
  { id: 'bhim', label: 'BHIM' },
]

export function ProfileScreen({ navigation }) {
  const {
    addDonation,
    currentUser,
    darkMode,
    fetchLibrary,
    fundCategories,
    isAuthenticated,
    language,
    logout,
    refreshUserData,
    toggleDarkMode,
    toggleLanguage,
    totalDonations,
    userData,
    userDonations,
    pendingPaymentIntents,
    createEventPaymentIntent,
    registerForEvent,
    submitDonationProof,
    working,
  } = useApp()
  const theme = getTheme(darkMode)
  const [ebookCatalog, setEbookCatalog] = useState([])
  const [latestEventPayment, setLatestEventPayment] = useState(null)
  const [eventPaymentOpen, setEventPaymentOpen] = useState(false)
  const [eventPaymentError, setEventPaymentError] = useState('')
  const [eventPaymentSuccess, setEventPaymentSuccess] = useState('')
  const [profileDonationForm, setProfileDonationForm] = useState({
    amount: '',
    purpose: '',
    paymentMethod: 'UPI',
  })
  const [profileDonationError, setProfileDonationError] = useState('')
  const [latestProfileDonation, setLatestProfileDonation] = useState(null)
  const [profileDonationOpen, setProfileDonationOpen] = useState(false)
  const [profileProofForm, setProfileProofForm] = useState({
    payerName: '',
    payerUtr: '',
  })
  const [profileProofError, setProfileProofError] = useState('')
  const [profileProofSuccess, setProfileProofSuccess] = useState('')
  const [eventRegisterError, setEventRegisterError] = useState('')
  const [eventRegisterSuccess, setEventRegisterSuccess] = useState('')
  const [eventSeatsById, setEventSeatsById] = useState({})
  const [eventPaymentForm, setEventPaymentForm] = useState({
    payerName: '',
    payerUtr: '',
  })

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

  useEffect(() => {
    if (!isAuthenticated) return
    refreshUserData(undefined, { silent: true })
  }, [isAuthenticated, refreshUserData])

  const savedBooks = useMemo(
    () => ebookCatalog.filter((book) => currentUser?.savedEbookIds.includes(book.id)),
    [ebookCatalog, currentUser],
  )

  const family = userData?.family || userData?.summary?.family || null
  const events = useMemo(() => userData?.summary?.events || [], [userData])
  const eventRegistrations = useMemo(() => userData?.summary?.eventRegistrations || [], [userData])
  const registrationByEventId = useMemo(
    () => Object.fromEntries((eventRegistrations || []).map((registration) => [registration.eventId, registration])),
    [eventRegistrations],
  )
  const receipts = useMemo(() => userData?.summary?.receipts || [], [userData])
  const sortedReceipts = useMemo(
    () => [...receipts].sort((left, right) => String(right.paidAt || '').localeCompare(String(left.paidAt || ''))),
    [receipts],
  )
  const pendingIntentLookup = useMemo(
    () => Object.fromEntries((pendingPaymentIntents || []).map((intent) => [intent.linkedTransactionId || '', intent.status || ''])),
    [pendingPaymentIntents],
  )
  const selectedProfileDonationPurpose = profileDonationForm.purpose || fundCategories?.[0] || 'General Fund'
  const rootNavigation = navigation.getParent() || navigation

  async function handleRegisterEvent(event) {
    if (!event?.id) return

    setEventRegisterError('')
    setEventRegisterSuccess('')

    const seatsRequested = Number(eventSeatsById[event.id] || 1)
    if (!Number.isInteger(seatsRequested) || seatsRequested < 1) {
      setEventRegisterError('Please enter a valid seat count.')
      return
    }
    if (seatsRequested > Number(event.seatsAvailable || 0)) {
      setEventRegisterError('Requested seats are not available for this event.')
      return
    }

    const result = await registerForEvent({
      eventId: event.id,
      seats: seatsRequested,
      notes: `Self registration from profile for ${event.name || event.id}`,
    })
    if (!result.ok) {
      setEventRegisterError(result.message || 'Unable to register for this event right now.')
      return
    }

    setEventSeatsById((current) => ({ ...current, [event.id]: 1 }))
    setEventRegisterSuccess(result.transaction
      ? 'Registration created. Complete payment from My Event Registrations.'
      : 'Registration created and approved.')
  }

  async function handleCreateProfileDonation() {
    setProfileDonationError('')
    const amount = Number(profileDonationForm.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      setProfileDonationError('Please enter a valid donation amount.')
      return
    }
    const purpose = String(selectedProfileDonationPurpose || '').trim()
    if (!purpose) {
      setProfileDonationError('Please choose a valid purpose.')
      return
    }

    const result = await addDonation({
      amount,
      purpose,
      paymentMethod: profileDonationForm.paymentMethod,
    })
    if (!result.ok) {
      setProfileDonationError(result.message || 'Unable to create donation payment intent right now.')
      return
    }

    setLatestProfileDonation(result.donation || null)
    setProfileProofForm({
      payerName: currentUser?.name || '',
      payerUtr: '',
    })
    setProfileProofError('')
    setProfileProofSuccess('')
    setProfileDonationOpen(true)
  }

  async function handleSubmitProfileDonationProof() {
    if (!latestProfileDonation?.id) return

    const payerName = String(profileProofForm.payerName || '').trim()
    const payerUtr = String(profileProofForm.payerUtr || '').trim()
    setProfileProofError('')
    setProfileProofSuccess('')

    if (!payerName) {
      setProfileProofError('Please enter payer name.')
      return
    }
    if (payerUtr.length < 8) {
      setProfileProofError('Please enter a valid UTR / Transaction ID (minimum 8 characters).')
      return
    }

    const result = await submitDonationProof({
      paymentId: latestProfileDonation.id,
      payerName,
      payerUtr,
    })
    if (!result.ok) {
      setProfileProofError(result.message || 'Unable to submit payment proof right now.')
      return
    }

    setLatestProfileDonation((current) => (current ? { ...current, proofSubmitted: true } : current))
    setProfileProofSuccess('Proof submitted successfully. Team will verify your payment shortly.')
  }

  async function handleStartEventPayment(registration) {
    if (!registration?.linkedTransaction?.id) return
    setEventPaymentError('')
    setEventPaymentSuccess('')

    const result = await createEventPaymentIntent({
      linkedTransactionId: registration.linkedTransaction.id,
      note: `Event payment: ${registration.eventName || registration.eventId || registration.id}`,
    })
    if (!result.ok) {
      setEventPaymentError(result.message || 'Unable to start event payment.')
      return
    }

    setLatestEventPayment({
      ...result.donation,
      registration,
    })
    setEventPaymentForm({
      payerName: currentUser?.name || '',
      payerUtr: '',
    })
    setEventPaymentOpen(true)
  }

  async function handleSubmitEventProof() {
    if (!latestEventPayment?.id) return

    const payerName = String(eventPaymentForm.payerName || '').trim()
    const payerUtr = String(eventPaymentForm.payerUtr || '').trim()
    setEventPaymentError('')
    setEventPaymentSuccess('')

    if (!payerName) {
      setEventPaymentError('Please enter payer name.')
      return
    }
    if (payerUtr.length < 8) {
      setEventPaymentError('Please enter a valid UTR / Transaction ID (minimum 8 characters).')
      return
    }

    const result = await submitDonationProof({
      paymentId: latestEventPayment.id,
      payerName,
      payerUtr,
    })
    if (!result.ok) {
      setEventPaymentError(result.message || 'Unable to submit payment proof right now.')
      return
    }

    setLatestEventPayment((current) => (current ? { ...current, proofSubmitted: true } : current))
    setEventPaymentSuccess('Proof submitted successfully. Team will verify your payment shortly.')
  }

  function closeEventPayment() {
    setEventPaymentOpen(false)
    setLatestEventPayment(null)
    setEventPaymentError('')
    setEventPaymentSuccess('')
  }

  function closeProfileDonation() {
    setProfileDonationOpen(false)
    setLatestProfileDonation(null)
    setProfileProofError('')
    setProfileProofSuccess('')
  }

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
        <Text style={[styles.sectionEyebrow, { color: theme.colors.accentStrong }]}>Quick Donation Payment</Text>
        <Text style={[styles.cardBody, { color: theme.colors.textMuted }]}>
          Create payment intent from profile, complete payment, and submit proof from here.
        </Text>

        <FormField
          keyboardType="numeric"
          label="Donation Amount (INR)"
          onChangeText={(value) => setProfileDonationForm((current) => ({ ...current, amount: value }))}
          placeholder="Enter donation amount"
          style={styles.fieldGap}
          theme={theme}
          value={profileDonationForm.amount}
        />

        <Text style={[styles.inputLabel, { color: theme.colors.textMuted }]}>Payment mode</Text>
        <View style={styles.segmentRow}>
          {['UPI', 'Bank Transfer'].map((method) => (
            <PrimaryButton
              key={method}
              onPress={() => setProfileDonationForm((current) => ({ ...current, paymentMethod: method }))}
              style={styles.segmentButton}
              theme={theme}
              title={method}
              variant={profileDonationForm.paymentMethod === method ? 'primary' : 'secondary'}
            />
          ))}
        </View>

        <Text style={[styles.inputLabel, { color: theme.colors.textMuted }]}>Purpose</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(fundCategories || []).map((item) => {
            const selected = selectedProfileDonationPurpose === item
            return (
              <PrimaryButton
                key={item}
                onPress={() => setProfileDonationForm((current) => ({ ...current, purpose: item }))}
                style={styles.purposeButton}
                theme={theme}
                title={item}
                variant={selected ? 'primary' : 'secondary'}
              />
            )
          })}
        </ScrollView>

        {profileDonationError ? (
          <Text style={[styles.cardBody, { color: '#b91c1c' }]}>{profileDonationError}</Text>
        ) : null}

        <PrimaryButton
          disabled={working}
          onPress={handleCreateProfileDonation}
          style={styles.fieldGap}
          theme={theme}
          title="Create Payment Intent"
        />
      </SectionCard>

      <SectionCard style={styles.stackGap} theme={theme}>
        <Text style={[styles.sectionEyebrow, { color: theme.colors.accentStrong }]}>Mandir Events</Text>
        {eventRegisterError ? (
          <Text style={[styles.cardBody, { color: '#b91c1c' }]}>{eventRegisterError}</Text>
        ) : null}
        {eventRegisterSuccess ? (
          <Text style={[styles.cardBody, { color: '#166534' }]}>{eventRegisterSuccess}</Text>
        ) : null}
        {events.length === 0 ? (
          <Text style={[styles.cardBody, { color: theme.colors.textMuted }]}>No events published yet.</Text>
        ) : (
          events.map((event) => (
            <View key={event.id} style={styles.historyItem}>
              <View style={styles.historyText}>
                <Text style={[styles.historyTitle, { color: theme.colors.text }]}>{event.name}</Text>
                <Text style={[styles.historyMeta, { color: theme.colors.textMuted }]}>
                  {formatLocalizedDate(event.date, language, { day: '2-digit', month: 'short', year: 'numeric' })} | Hall: {event.hall || '-'}
                </Text>
                <Text style={[styles.historyMeta, { color: theme.colors.textMuted }]}>
                  Fee: {formatLocalizedCurrency(event.feePerFamily || 0, language)} | Seats: {event.seatsAvailable ?? 0}/{event.capacity || 0}
                </Text>
                <Text style={[styles.historyMeta, { color: theme.colors.textMuted }]}>
                  Registered: {registrationByEventId[event.id] || event.isFamilyRegistered ? 'Yes' : 'No'}
                </Text>

                {!registrationByEventId[event.id] && !event.isFamilyRegistered && Number(event.seatsAvailable || 0) > 0 ? (
                  <View style={styles.fieldGap}>
                    <FormField
                      keyboardType="number-pad"
                      label="Seats to register"
                      onChangeText={(value) => setEventSeatsById((current) => ({ ...current, [event.id]: value }))}
                      placeholder="1"
                      theme={theme}
                      value={String(eventSeatsById[event.id] ?? 1)}
                    />
                    <PrimaryButton
                      disabled={working}
                      onPress={() => handleRegisterEvent(event)}
                      style={styles.fieldGap}
                      theme={theme}
                      title="Register"
                      variant="secondary"
                    />
                  </View>
                ) : null}

                {!registrationByEventId[event.id] && !event.isFamilyRegistered && Number(event.seatsAvailable || 0) <= 0 ? (
                  <Text style={[styles.historyAmount, { color: '#b91c1c', marginTop: 8 }]}>Sold out</Text>
                ) : null}
              </View>
            </View>
          ))
        )}
      </SectionCard>

      <SectionCard style={styles.stackGap} theme={theme}>
        <Text style={[styles.sectionEyebrow, { color: theme.colors.accentStrong }]}>My Event Registrations</Text>
        {eventPaymentError ? (
          <Text style={[styles.cardBody, { color: '#b91c1c' }]}>{eventPaymentError}</Text>
        ) : null}
        {eventRegistrations.length === 0 ? (
          <Text style={[styles.cardBody, { color: theme.colors.textMuted }]}>No event registrations found for your family yet.</Text>
        ) : (
          eventRegistrations.map((registration) => {
            const linkedStatus = registration.linkedTransaction?.status || ''
            const pendingIntentStatus = pendingIntentLookup[registration.linkedTransaction?.id || ''] || ''
            const paymentStatus = registration.paymentStatus || linkedStatus || '-'
            const approvalStatus = registration.approvalStatus || '-'
            const isPaid = linkedStatus === 'Paid' || paymentStatus === 'Paid'
            const hasPendingIntent = ['Pending', 'Proof Submitted'].includes(pendingIntentStatus)
            const isPending = hasPendingIntent || paymentStatus === 'Proof Submitted'
            const canPayNow = Boolean(registration.canPayNow) && !isPaid && !hasPendingIntent
            const isNotRequired = paymentStatus === 'Not Required'

            return (
              <View key={registration.id} style={styles.receiptItem}>
                <View style={styles.historyText}>
                  <Text style={[styles.historyTitle, { color: theme.colors.text }]}>
                    {registration.eventName || registration.eventId}
                  </Text>
                  <Text style={[styles.historyMeta, { color: theme.colors.textMuted }]}>
                    {formatLocalizedDate(registration.eventDate || registration.registeredAt, language, { day: '2-digit', month: 'short', year: 'numeric' })} | Hall: {registration.eventHall || '-'}
                  </Text>
                  <Text style={[styles.historyMeta, { color: theme.colors.textMuted }]}>
                    Seats: {registration.seats || 0} | Amount: {formatLocalizedCurrency(registration.totalAmount || 0, language)}
                  </Text>
                  <Text style={[styles.historyMeta, { color: theme.colors.textMuted }]}>
                    Status: {paymentStatus} | Approval: {approvalStatus}
                  </Text>
                </View>

                {isPaid ? (
                  <Text style={[styles.historyAmount, { color: '#166534' }]}>Paid</Text>
                ) : isPending ? (
                  <Text style={[styles.historyAmount, { color: '#92400e' }]}>Payment Pending</Text>
                ) : canPayNow ? (
                  <PrimaryButton
                    disabled={working}
                    onPress={() => handleStartEventPayment(registration)}
                    style={styles.receiptButton}
                    theme={theme}
                    title="Pay Now"
                    variant="secondary"
                  />
                ) : isNotRequired ? (
                  <Text style={[styles.historyAmount, { color: theme.colors.textMuted }]}>Not required</Text>
                ) : (
                  <Text style={[styles.historyAmount, { color: '#92400e' }]}>Payment Pending</Text>
                )}
              </View>
            )
          })
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

      <Modal animationType="slide" onRequestClose={closeProfileDonation} visible={profileDonationOpen}>
        <View style={[styles.modalWrap, { backgroundColor: theme.colors.background }]}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              {latestProfileDonation?.proofSubmitted ? 'Donation Submitted' : 'Complete Your Donation'}
            </Text>
            <Text style={[styles.cardBody, { color: theme.colors.textMuted }]}>
              Donation payment intent created for {formatLocalizedCurrency(latestProfileDonation?.amount, language)}.
            </Text>

            {latestProfileDonation ? (
              <>
                <Text style={[styles.modalMeta, { color: theme.colors.textMuted }]}>
                  Purpose: {latestProfileDonation.purpose || '-'}
                </Text>
                <Text style={[styles.modalMeta, { color: theme.colors.textMuted }]}>
                  Gateway: {latestProfileDonation.paymentMethod || '-'}
                </Text>
                <Text style={[styles.modalMeta, { color: theme.colors.textMuted }]}>
                  Date: {formatLocalizedDate(latestProfileDonation.date, language, { day: '2-digit', month: 'short', year: 'numeric' })}
                </Text>

                {latestProfileDonation.instructions?.upiLink ? (
                  <SectionCard style={styles.stackGap} theme={theme}>
                    <Text style={[styles.sectionEyebrow, { color: theme.colors.accentStrong }]}>UPI Payment</Text>
                    <Text style={[styles.cardBody, { color: theme.colors.textMuted }]}>
                      Use your preferred UPI app to complete payment, then submit proof below.
                    </Text>
                    {upiAppOptions.map((option) => (
                      <PrimaryButton
                        key={option.id}
                        onPress={() => {
                          Linking.openURL(latestProfileDonation.instructions.upiLink).catch(() => {})
                        }}
                        style={styles.fieldGap}
                        theme={theme}
                        title={option.label}
                        variant={option.id === 'any' ? 'primary' : 'secondary'}
                      />
                    ))}
                    <Text style={[styles.linkText, { color: theme.colors.textMuted }]}>
                      {latestProfileDonation.instructions.upiLink}
                    </Text>
                  </SectionCard>
                ) : null}

                {latestProfileDonation.instructions?.bankTransfer ? (
                  <SectionCard style={styles.stackGap} theme={theme}>
                    <Text style={[styles.sectionEyebrow, { color: theme.colors.accentStrong }]}>Bank Transfer</Text>
                    <Text style={[styles.cardBody, { color: theme.colors.textMuted }]}>
                      {latestProfileDonation.instructions.bankTransfer.payeeName}
                    </Text>
                    <Text style={[styles.modalMeta, { color: theme.colors.textMuted }]}>
                      {latestProfileDonation.instructions.bankTransfer.bankName}
                    </Text>
                    <Text style={[styles.modalMeta, { color: theme.colors.textMuted }]}>
                      A/C: {latestProfileDonation.instructions.bankTransfer.accountNumber}
                    </Text>
                    <Text style={[styles.modalMeta, { color: theme.colors.textMuted }]}>
                      IFSC: {latestProfileDonation.instructions.bankTransfer.ifsc}
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
                    onChangeText={(value) => setProfileProofForm((current) => ({ ...current, payerName: value }))}
                    placeholder="Name used during payment"
                    style={styles.fieldGap}
                    theme={theme}
                    value={profileProofForm.payerName}
                  />
                  <FormField
                    autoCapitalize="characters"
                    autoCorrect={false}
                    label="UTR / Transaction ID"
                    onChangeText={(value) => setProfileProofForm((current) => ({ ...current, payerUtr: value }))}
                    placeholder="Enter UTR or reference number"
                    style={styles.fieldGap}
                    theme={theme}
                    value={profileProofForm.payerUtr}
                  />

                  {profileProofError ? (
                    <View style={[styles.notice, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
                      <Text style={styles.noticeText}>{profileProofError}</Text>
                    </View>
                  ) : null}
                  {profileProofSuccess ? (
                    <View style={[styles.notice, { backgroundColor: '#ecfdf5', borderColor: '#bbf7d0' }]}>
                      <Text style={[styles.noticeText, { color: '#166534' }]}>{profileProofSuccess}</Text>
                    </View>
                  ) : null}

                  {!latestProfileDonation.proofSubmitted ? (
                    <PrimaryButton
                      disabled={working}
                      onPress={handleSubmitProfileDonationProof}
                      style={styles.fieldGap}
                      theme={theme}
                      title={working ? 'Submitting proof...' : 'Submit proof'}
                    />
                  ) : null}
                </SectionCard>
              </>
            ) : null}

            <PrimaryButton
              onPress={closeProfileDonation}
              style={styles.stackGap}
              theme={theme}
              title="Close"
              variant="secondary"
            />
          </ScrollView>
        </View>
      </Modal>

      <Modal animationType="slide" onRequestClose={closeEventPayment} visible={eventPaymentOpen}>
        <View style={[styles.modalWrap, { backgroundColor: theme.colors.background }]}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Complete Event Payment
            </Text>
            <Text style={[styles.cardBody, { color: theme.colors.textMuted }]}>
              Event payment intent created for {formatLocalizedCurrency(latestEventPayment?.amount, language)}.
            </Text>

            {latestEventPayment ? (
              <>
                <Text style={[styles.modalMeta, { color: theme.colors.textMuted }]}>
                  Event: {latestEventPayment.registration?.eventName || latestEventPayment.purpose}
                </Text>
                <Text style={[styles.modalMeta, { color: theme.colors.textMuted }]}>
                  Date: {formatLocalizedDate(latestEventPayment.date, language, { day: '2-digit', month: 'short', year: 'numeric' })}
                </Text>

                {latestEventPayment.instructions?.upiLink ? (
                  <SectionCard style={styles.stackGap} theme={theme}>
                    <Text style={[styles.sectionEyebrow, { color: theme.colors.accentStrong }]}>UPI Payment</Text>
                    <Text style={[styles.cardBody, { color: theme.colors.textMuted }]}>
                      Use your preferred UPI app to complete payment, then submit proof below.
                    </Text>
                    {upiAppOptions.map((option) => (
                      <PrimaryButton
                        key={option.id}
                        onPress={() => {
                          Linking.openURL(latestEventPayment.instructions.upiLink).catch(() => {})
                        }}
                        style={styles.fieldGap}
                        theme={theme}
                        title={option.label}
                        variant={option.id === 'any' ? 'primary' : 'secondary'}
                      />
                    ))}
                    <Text style={[styles.linkText, { color: theme.colors.textMuted }]}>
                      {latestEventPayment.instructions.upiLink}
                    </Text>
                  </SectionCard>
                ) : null}

                {latestEventPayment.instructions?.bankTransfer ? (
                  <SectionCard style={styles.stackGap} theme={theme}>
                    <Text style={[styles.sectionEyebrow, { color: theme.colors.accentStrong }]}>Bank Transfer</Text>
                    <Text style={[styles.cardBody, { color: theme.colors.textMuted }]}>
                      {latestEventPayment.instructions.bankTransfer.payeeName}
                    </Text>
                    <Text style={[styles.modalMeta, { color: theme.colors.textMuted }]}>
                      {latestEventPayment.instructions.bankTransfer.bankName}
                    </Text>
                    <Text style={[styles.modalMeta, { color: theme.colors.textMuted }]}>
                      A/C: {latestEventPayment.instructions.bankTransfer.accountNumber}
                    </Text>
                    <Text style={[styles.modalMeta, { color: theme.colors.textMuted }]}>
                      IFSC: {latestEventPayment.instructions.bankTransfer.ifsc}
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
                    onChangeText={(value) => setEventPaymentForm((current) => ({ ...current, payerName: value }))}
                    placeholder="Name used during payment"
                    style={styles.fieldGap}
                    theme={theme}
                    value={eventPaymentForm.payerName}
                  />
                  <FormField
                    autoCapitalize="characters"
                    autoCorrect={false}
                    label="UTR / Transaction ID"
                    onChangeText={(value) => setEventPaymentForm((current) => ({ ...current, payerUtr: value }))}
                    placeholder="Enter UTR or reference number"
                    style={styles.fieldGap}
                    theme={theme}
                    value={eventPaymentForm.payerUtr}
                  />

                  {eventPaymentError ? (
                    <View style={[styles.notice, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
                      <Text style={styles.noticeText}>{eventPaymentError}</Text>
                    </View>
                  ) : null}
                  {eventPaymentSuccess ? (
                    <View style={[styles.notice, { backgroundColor: '#ecfdf5', borderColor: '#bbf7d0' }]}>
                      <Text style={[styles.noticeText, { color: '#166534' }]}>{eventPaymentSuccess}</Text>
                    </View>
                  ) : null}

                  {!latestEventPayment.proofSubmitted ? (
                    <PrimaryButton
                      disabled={working}
                      onPress={handleSubmitEventProof}
                      style={styles.fieldGap}
                      theme={theme}
                      title={working ? 'Submitting proof...' : 'Submit proof'}
                    />
                  ) : null}
                </SectionCard>
              </>
            ) : null}

            <PrimaryButton
              onPress={closeEventPayment}
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
  segmentRow: {
    flexDirection: 'row',
    gap: 10,
  },
  segmentButton: {
    flex: 1,
  },
  purposeButton: {
    marginRight: 10,
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
  linkText: {
    fontSize: 12,
    lineHeight: 20,
    marginTop: 12,
  },
})
