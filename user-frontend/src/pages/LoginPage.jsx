import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Card } from '../components/Card'
import { PageHeader } from '../components/PageHeader'
import { useApp } from '../context/AppContext'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, working } = useApp()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    const result = await login({ identifier, password })
    if (!result.ok) {
      setError(result.message)
      return
    }

    const fallbackPath = '/profile'
    const fromPath = location.state?.from || fallbackPath
    navigate(fromPath, { replace: true })
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-5">
      <PageHeader
        eyebrow="Authentication"
        title="Login"
        description="Use email, WhatsApp (+91...), or Family ID to access your profile dashboard."
      />

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-identifier" className="mb-1 block text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              Email / WhatsApp / Family ID
            </label>
            <input
              id="login-identifier"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              className="focus-ring w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm dark:border-orange-900/40 dark:bg-zinc-900"
              placeholder="priya@jainmandir.org or +919876543210 or FAM-0001"
              required
            />
          </div>

          <div>
            <label htmlFor="login-password" className="mb-1 block text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="focus-ring w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm dark:border-orange-900/40 dark:bg-zinc-900"
              placeholder="Enter password"
              required
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-200">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={working}
            className="focus-ring rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-105 disabled:opacity-70"
          >
            {working ? 'Signing In...' : 'Login'}
          </button>
        </form>

        <div className="mt-4 space-y-1 text-sm text-zinc-600 dark:text-zinc-300">
          <p>
            New user?{' '}
            <Link to="/signup" className="font-semibold text-orange-700 dark:text-orange-300">
              Signup
            </Link>
          </p>
          <p>
            Forgot password?{' '}
            <Link to="/forgot-password" className="font-semibold text-orange-700 dark:text-orange-300">
              Reset here
            </Link>
          </p>
        </div>
      </Card>
    </div>
  )
}
