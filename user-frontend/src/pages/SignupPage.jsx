import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card } from '../components/Card'
import { PageHeader } from '../components/PageHeader'
import { useApp } from '../context/AppContext'

export function SignupPage() {
  const navigate = useNavigate()
  const { signup, working } = useApp()
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

  function handleChange(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
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
    navigate('/profile', { replace: true })
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      <PageHeader
        eyebrow="Authentication"
        title="Signup"
        description="Create your devotee account to manage donations and spiritual content."
      />

      <Card>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="signup-name" className="mb-1 block text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              Full Name
            </label>
            <input
              id="signup-name"
              value={form.fullName}
              onChange={(event) => handleChange('fullName', event.target.value)}
              className="focus-ring w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm dark:border-orange-900/40 dark:bg-zinc-900"
              required
            />
          </div>

          <div>
            <label htmlFor="signup-gotra" className="mb-1 block text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              Gotra
            </label>
            <input
              id="signup-gotra"
              value={form.gotra}
              onChange={(event) => handleChange('gotra', event.target.value)}
              className="focus-ring w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm dark:border-orange-900/40 dark:bg-zinc-900"
              required
            />
          </div>

          <div>
            <label htmlFor="signup-email" className="mb-1 block text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              Email
            </label>
            <input
              id="signup-email"
              type="email"
              value={form.email}
              onChange={(event) => handleChange('email', event.target.value)}
              className="focus-ring w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm dark:border-orange-900/40 dark:bg-zinc-900"
              required
            />
          </div>

          <div>
            <label htmlFor="signup-whatsapp" className="mb-1 block text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              WhatsApp (+91...)
            </label>
            <input
              id="signup-whatsapp"
              value={form.whatsapp}
              onChange={(event) => handleChange('whatsapp', event.target.value)}
              className="focus-ring w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm dark:border-orange-900/40 dark:bg-zinc-900"
              placeholder="+919876543210"
              required
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="signup-address" className="mb-1 block text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              Address
            </label>
            <input
              id="signup-address"
              value={form.address}
              onChange={(event) => handleChange('address', event.target.value)}
              className="focus-ring w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm dark:border-orange-900/40 dark:bg-zinc-900"
              required
            />
          </div>

          <div>
            <label htmlFor="signup-password" className="mb-1 block text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              Password
            </label>
            <input
              id="signup-password"
              type="password"
              value={form.password}
              onChange={(event) => handleChange('password', event.target.value)}
              className="focus-ring w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm dark:border-orange-900/40 dark:bg-zinc-900"
              required
            />
          </div>

          <div>
            <label htmlFor="signup-confirm" className="mb-1 block text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              Confirm Password
            </label>
            <input
              id="signup-confirm"
              type="password"
              value={form.confirmPassword}
              onChange={(event) => handleChange('confirmPassword', event.target.value)}
              className="focus-ring w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm dark:border-orange-900/40 dark:bg-zinc-900"
              required
            />
          </div>

          {error && (
            <p className="sm:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-200">
              {error}
            </p>
          )}

          <div className="sm:col-span-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={working}
              className="focus-ring rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-105 disabled:opacity-70"
            >
              {working ? 'Creating...' : 'Create Account'}
            </button>
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              Already registered?{' '}
              <Link to="/login" className="font-semibold text-orange-700 dark:text-orange-300">
                Login
              </Link>
            </p>
          </div>
        </form>
      </Card>
    </div>
  )
}
