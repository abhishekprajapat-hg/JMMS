import { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { pickByLanguage, translateValue } from '../utils/i18n'

const paymentMethods = ['UPI', 'Bank Transfer']
const defaultPurposeOptions = [
  'General Fund',
  'Mandir Nirman',
  'Shanti Dhara',
  'Jiv Daya',
  'Aahar Daan',
]

function defaultFormValues(values, purposeOptions) {
  const resolvedPurposes = Array.isArray(purposeOptions) && purposeOptions.length
    ? purposeOptions
    : defaultPurposeOptions
  return {
    name: values?.name || '',
    email: values?.email || '',
    phone: values?.phone || '',
    amount: values?.amount || '',
    purpose: values?.purpose || resolvedPurposes[0],
    paymentMethod: values?.paymentMethod || 'UPI',
  }
}

function InputLabel({ htmlFor, children }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-zinc-600 dark:text-zinc-300">
      {children}
    </label>
  )
}

export function DonationForm({ onSubmit, defaultValues, purposeOptions = defaultPurposeOptions }) {
  const { language } = useApp()
  const resolvedPurposes = Array.isArray(purposeOptions) && purposeOptions.length
    ? purposeOptions
    : defaultPurposeOptions
  const [form, setForm] = useState(defaultFormValues(defaultValues, resolvedPurposes))

  const copy = pickByLanguage(language, {
    en: {
      name: 'Name',
      namePlaceholder: 'Enter full name',
      email: 'Email',
      emailPlaceholder: 'name@example.com',
      phone: 'Phone',
      phonePlaceholder: '10-digit phone',
      amount: 'Amount (INR)',
      amountPlaceholder: 'e.g. 1100',
      purpose: 'Purpose',
      paymentMethod: 'Payment Method',
      donate: 'Donate Now',
    },
    hi: {
      name: 'नाम',
      namePlaceholder: 'पूरा नाम दर्ज करें',
      email: 'ईमेल',
      emailPlaceholder: 'name@example.com',
      phone: 'फ़ोन',
      phonePlaceholder: '10 अंकों का फ़ोन',
      amount: 'राशि (INR)',
      amountPlaceholder: 'जैसे 1100',
      purpose: 'उद्देश्य',
      paymentMethod: 'भुगतान विधि',
      donate: 'अभी दान करें',
    },
  })

  useEffect(() => {
    setForm(defaultFormValues(defaultValues, resolvedPurposes))
  }, [defaultValues, resolvedPurposes])

  function handleSubmit(event) {
    event.preventDefault()
    onSubmit({
      ...form,
      amount: Number(form.amount),
    })
    setForm((previous) => ({
      ...previous,
      amount: '',
      purpose: resolvedPurposes[0],
      paymentMethod: 'UPI',
    }))
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <InputLabel htmlFor="donor-name">{copy.name}</InputLabel>
          <input
            id="donor-name"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            className="focus-ring w-full rounded-[18px] border border-orange-200/80 bg-white/80 px-4 py-3 text-sm dark:border-orange-900/40 dark:bg-zinc-900/70"
            placeholder={copy.namePlaceholder}
            required
          />
        </div>
        <div>
          <InputLabel htmlFor="donor-email">{copy.email}</InputLabel>
          <input
            id="donor-email"
            type="email"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            className="focus-ring w-full rounded-[18px] border border-orange-200/80 bg-white/80 px-4 py-3 text-sm dark:border-orange-900/40 dark:bg-zinc-900/70"
            placeholder={copy.emailPlaceholder}
            required
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <InputLabel htmlFor="donor-phone">{copy.phone}</InputLabel>
          <input
            id="donor-phone"
            value={form.phone}
            onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
            className="focus-ring w-full rounded-[18px] border border-orange-200/80 bg-white/80 px-4 py-3 text-sm dark:border-orange-900/40 dark:bg-zinc-900/70"
            placeholder={copy.phonePlaceholder}
            required
          />
        </div>
        <div>
          <InputLabel htmlFor="donor-amount">{copy.amount}</InputLabel>
          <input
            id="donor-amount"
            type="number"
            min={101}
            value={form.amount}
            onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
            className="focus-ring w-full rounded-[18px] border border-orange-200/80 bg-white/80 px-4 py-3 text-sm dark:border-orange-900/40 dark:bg-zinc-900/70"
            placeholder={copy.amountPlaceholder}
            required
          />
        </div>
      </div>

      <div>
        <InputLabel htmlFor="donation-purpose">{copy.purpose}</InputLabel>
        <select
          id="donation-purpose"
          value={form.purpose}
          onChange={(event) => setForm((current) => ({ ...current, purpose: event.target.value }))}
          className="focus-ring w-full rounded-[18px] border border-orange-200/80 bg-white/80 px-4 py-3 text-sm dark:border-orange-900/40 dark:bg-zinc-900/70"
        >
          {resolvedPurposes.map((purpose) => (
            <option key={purpose} value={purpose}>{translateValue(language, purpose)}</option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-600 dark:text-zinc-300">{copy.paymentMethod}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {paymentMethods.map((method) => (
            <label
              key={method}
              className={`focus-within:ring-2 focus-within:ring-orange-300 rounded-[18px] border px-4 py-3 text-sm font-semibold transition ${
                form.paymentMethod === method
                  ? 'border-orange-500 bg-orange-50 text-orange-900 dark:border-orange-400 dark:bg-orange-950/50 dark:text-orange-100'
                  : 'border-orange-200/80 bg-white/80 text-zinc-700 dark:border-orange-900/40 dark:bg-zinc-900/70 dark:text-zinc-200'
              }`}
            >
              <input
                type="radio"
                className="sr-only"
                name="payment-method"
                value={method}
                checked={form.paymentMethod === method}
                onChange={() => setForm((current) => ({ ...current, paymentMethod: method }))}
              />
              {translateValue(language, method)}
            </label>
          ))}
        </div>
      </fieldset>

      <button
        type="submit"
        className="focus-ring rounded-full bg-[linear-gradient(135deg,#c2410c,#f59e0b)] px-6 py-3 text-sm font-bold text-white shadow-[0_14px_26px_rgba(194,65,12,0.24)] transition hover:brightness-105"
      >
        {copy.donate}
      </button>
    </form>
  )
}
