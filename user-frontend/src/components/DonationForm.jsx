import { useEffect, useState } from 'react'

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
    <label htmlFor={htmlFor} className="mb-1 block text-sm font-semibold text-zinc-700 dark:text-zinc-200">
      {children}
    </label>
  )
}

export function DonationForm({ onSubmit, defaultValues, purposeOptions = defaultPurposeOptions }) {
  const resolvedPurposes = Array.isArray(purposeOptions) && purposeOptions.length
    ? purposeOptions
    : defaultPurposeOptions
  const [form, setForm] = useState(defaultFormValues(defaultValues, resolvedPurposes))

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
          <InputLabel htmlFor="donor-name">Name</InputLabel>
          <input
            id="donor-name"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            className="focus-ring w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm dark:border-orange-900/40 dark:bg-zinc-900"
            placeholder="Enter full name"
            required
          />
        </div>
        <div>
          <InputLabel htmlFor="donor-email">Email</InputLabel>
          <input
            id="donor-email"
            type="email"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            className="focus-ring w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm dark:border-orange-900/40 dark:bg-zinc-900"
            placeholder="name@example.com"
            required
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <InputLabel htmlFor="donor-phone">Phone</InputLabel>
          <input
            id="donor-phone"
            value={form.phone}
            onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
            className="focus-ring w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm dark:border-orange-900/40 dark:bg-zinc-900"
            placeholder="10-digit phone"
            required
          />
        </div>
        <div>
          <InputLabel htmlFor="donor-amount">Amount (INR)</InputLabel>
          <input
            id="donor-amount"
            type="number"
            min={101}
            value={form.amount}
            onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
            className="focus-ring w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm dark:border-orange-900/40 dark:bg-zinc-900"
            placeholder="e.g. 1100"
            required
          />
        </div>
      </div>

      <div>
        <InputLabel htmlFor="donation-purpose">Purpose</InputLabel>
        <select
          id="donation-purpose"
          value={form.purpose}
          onChange={(event) => setForm((current) => ({ ...current, purpose: event.target.value }))}
          className="focus-ring w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm dark:border-orange-900/40 dark:bg-zinc-900"
        >
          {resolvedPurposes.map((purpose) => (
            <option key={purpose}>{purpose}</option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200">Payment Method</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {paymentMethods.map((method) => (
            <label
              key={method}
              className={`focus-within:ring-2 focus-within:ring-orange-300 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                form.paymentMethod === method
                  ? 'border-orange-500 bg-orange-50 text-orange-900 dark:border-orange-400 dark:bg-orange-950/50 dark:text-orange-100'
                  : 'border-orange-200 bg-white text-zinc-700 dark:border-orange-900/40 dark:bg-zinc-900 dark:text-zinc-200'
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
              {method}
            </label>
          ))}
        </div>
      </fieldset>

      <button
        type="submit"
        className="focus-ring rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition hover:brightness-105"
      >
        Donate Now
      </button>
    </form>
  )
}
