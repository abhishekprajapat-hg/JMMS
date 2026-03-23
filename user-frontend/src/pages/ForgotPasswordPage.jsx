import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../components/Card'
import { PageHeader } from '../components/PageHeader'
import { useApp } from '../context/AppContext'
import { pickByLanguage } from '../utils/i18n'

export function ForgotPasswordPage() {
  const { requestPasswordReset, language } = useApp()
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  const copy = pickByLanguage(language, {
    en: {
      eyebrow: 'Authentication',
      title: 'Forgot Password',
      description: 'Enter your email. If reset API is configured, a reset link will be sent.',
      email: 'Email',
      send: 'Send Reset Link',
      backTo: 'Back to',
      login: 'Login',
    },
    hi: {
      eyebrow: 'प्रमाणीकरण',
      title: 'पासवर्ड भूल गए',
      description: 'अपना ईमेल दर्ज करें। यदि रीसेट API कॉन्फिगर है, तो रीसेट लिंक भेजा जाएगा।',
      email: 'ईमेल',
      send: 'रीसेट लिंक भेजें',
      backTo: 'वापस जाएँ',
      login: 'लॉगिन',
    },
  })

  async function handleSubmit(event) {
    event.preventDefault()
    const result = await requestPasswordReset(email)
    setMessage(result.message)
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-5">
      <PageHeader
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
      />

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="reset-email" className="mb-1 block text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              {copy.email}
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
            {copy.send}
          </button>
        </form>

        {message && (
          <p className="mt-4 rounded-lg bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-900 dark:bg-orange-950/60 dark:text-orange-100">
            {message}
          </p>
        )}

        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">
          {copy.backTo}{' '}
          <Link to="/login" className="font-semibold text-orange-700 dark:text-orange-300">
            {copy.login}
          </Link>
        </p>
      </Card>
    </div>
  )
}
