import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../components/Card'
import { PageHeader } from '../components/PageHeader'
import { useApp } from '../context/AppContext'

export function ForgotPasswordPage() {
  const { requestPasswordReset } = useApp()
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    const result = await requestPasswordReset(email)
    setMessage(result.message)
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-5">
      <PageHeader
        eyebrow="Authentication"
        title="Forgot Password"
        description="Enter your email. If reset API is configured, a reset link will be sent."
      />

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="reset-email" className="mb-1 block text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              Email
            </label>
            <input
              id="reset-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="focus-ring w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm dark:border-orange-900/40 dark:bg-zinc-900"
              required
            />
          </div>

          <button
            type="submit"
            className="focus-ring rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-105"
          >
            Send Reset Link
          </button>
        </form>

        {message && (
          <p className="mt-4 rounded-lg bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-900 dark:bg-orange-950/60 dark:text-orange-100">
            {message}
          </p>
        )}

        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">
          Back to{' '}
          <Link to="/login" className="font-semibold text-orange-700 dark:text-orange-300">
            Login
          </Link>
        </p>
      </Card>
    </div>
  )
}
