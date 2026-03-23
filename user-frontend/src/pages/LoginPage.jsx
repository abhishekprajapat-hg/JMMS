import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Card } from '../components/Card'
import { PageHeader } from '../components/PageHeader'
import { useApp } from '../context/AppContext'
import { pickByLanguage } from '../utils/i18n'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, working, language } = useApp()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const copy = pickByLanguage(language, {
    en: {
      eyebrow: 'Authentication',
      title: 'Login',
      description: 'Use email, WhatsApp (+91...), or Family ID to access your profile dashboard.',
      welcome: 'Welcome Back',
      heroTitle: 'Return to your mandir dashboard with calm, not friction.',
      heroBody: 'Track donations, revisit saved books, continue spiritual learning, and stay close to your sangh account.',
      loginOptions: 'Login Options',
      loginOptionsBody: 'Email, WhatsApp, or Family ID all work with the same account flow.',
      forgotAccess: 'Forgot Access?',
      forgotAccessBody: 'Reset quickly or create a fresh account if you are joining for the first time.',
      identifierLabel: 'Email / WhatsApp / Family ID',
      identifierPlaceholder: 'priya@jainmandir.org or +919876543210 or FAM-0001',
      password: 'Password',
      passwordPlaceholder: 'Enter password',
      signingIn: 'Signing In...',
      login: 'Login',
      newUser: 'New user?',
      signup: 'Signup',
      forgotPassword: 'Forgot password?',
      resetHere: 'Reset here',
    },
    hi: {
      eyebrow: 'प्रमाणीकरण',
      title: 'लॉगिन',
      description: 'अपनी प्रोफाइल डैशबोर्ड तक पहुँचने के लिए ईमेल, WhatsApp (+91...) या Family ID का उपयोग करें।',
      welcome: 'फिर से स्वागत है',
      heroTitle: 'अपने मंदिर डैशबोर्ड में सहजता के साथ वापस आएँ।',
      heroBody: 'दान ट्रैक करें, सेव की गई किताबें फिर से देखें, आध्यात्मिक अध्ययन जारी रखें और अपने संघ खाते से जुड़े रहें।',
      loginOptions: 'लॉगिन विकल्प',
      loginOptionsBody: 'ईमेल, WhatsApp या Family ID, सभी एक ही अकाउंट फ्लो में काम करते हैं।',
      forgotAccess: 'एक्सेस भूल गए?',
      forgotAccessBody: 'तेजी से रीसेट करें या पहली बार जुड़ रहे हैं तो नया अकाउंट बनाएँ।',
      identifierLabel: 'ईमेल / WhatsApp / Family ID',
      identifierPlaceholder: 'priya@jainmandir.org या +919876543210 या FAM-0001',
      password: 'पासवर्ड',
      passwordPlaceholder: 'पासवर्ड दर्ज करें',
      signingIn: 'लॉगिन हो रहा है...',
      login: 'लॉगिन',
      newUser: 'नए उपयोगकर्ता?',
      signup: 'साइनअप',
      forgotPassword: 'पासवर्ड भूल गए?',
      resetHere: 'यहाँ रीसेट करें',
    },
  })

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
    <div className="space-y-6">
      <PageHeader
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
      />

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="flex flex-col justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-700 dark:text-orange-300">{copy.welcome}</p>
            <h2 className="mt-2 font-serif text-4xl text-orange-950 dark:text-amber-50">{copy.heroTitle}</h2>
            <p className="mt-4 text-sm leading-8 text-zinc-600 dark:text-zinc-300">
              {copy.heroBody}
            </p>
          </div>

          <div className="mt-8 grid gap-3">
            <div className="rounded-[24px] border border-orange-200/70 bg-white/74 px-4 py-4 dark:border-orange-900/30 dark:bg-white/5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-700 dark:text-orange-300">{copy.loginOptions}</p>
              <p className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-300">{copy.loginOptionsBody}</p>
            </div>
            <div className="rounded-[24px] border border-orange-200/70 bg-white/74 px-4 py-4 dark:border-orange-900/30 dark:bg-white/5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-700 dark:text-orange-300">{copy.forgotAccess}</p>
              <p className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-300">{copy.forgotAccessBody}</p>
            </div>
          </div>
        </Card>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="login-identifier" className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-zinc-600 dark:text-zinc-300">
                {copy.identifierLabel}
              </label>
              <input
                id="login-identifier"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                className="focus-ring w-full rounded-[20px] border border-orange-200/80 bg-white/80 px-4 py-3 text-sm dark:border-orange-900/40 dark:bg-zinc-900/70"
                placeholder={copy.identifierPlaceholder}
                required
              />
            </div>

            <div>
              <label htmlFor="login-password" className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-zinc-600 dark:text-zinc-300">
                {copy.password}
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="focus-ring w-full rounded-[20px] border border-orange-200/80 bg-white/80 px-4 py-3 text-sm dark:border-orange-900/40 dark:bg-zinc-900/70"
                placeholder={copy.passwordPlaceholder}
                required
              />
            </div>

            {error && (
              <p className="rounded-[18px] bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-950/35 dark:text-red-200">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={working}
              className="focus-ring rounded-full bg-[linear-gradient(135deg,#c2410c,#f59e0b)] px-6 py-3 text-sm font-bold text-white shadow-[0_16px_28px_rgba(194,65,12,0.24)] transition hover:brightness-105 disabled:opacity-70"
            >
              {working ? copy.signingIn : copy.login}
            </button>
          </form>

          <div className="mt-5 space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
            <p>
              {copy.newUser}{' '}
              <Link to="/signup" className="font-semibold text-orange-700 dark:text-orange-300">
                {copy.signup}
              </Link>
            </p>
            <p>
              {copy.forgotPassword}{' '}
              <Link to="/forgot-password" className="font-semibold text-orange-700 dark:text-orange-300">
                {copy.resetHere}
              </Link>
            </p>
          </div>
        </Card>
      </section>
    </div>
  )
}
