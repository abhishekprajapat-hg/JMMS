import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card } from '../components/Card'
import { PageHeader } from '../components/PageHeader'
import { useApp } from '../context/AppContext'
import { pickByLanguage } from '../utils/i18n'

export function SignupPage() {
  const navigate = useNavigate()
  const { signup, working, language } = useApp()
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

  const copy = pickByLanguage(language, {
    en: {
      eyebrow: 'Authentication',
      title: 'Signup',
      description: 'Create your devotee account to manage donations, saved study material, and spiritual content.',
      join: 'Join The Sangh',
      heroTitle: 'Create a profile that keeps seva, learning, and family details in one place.',
      heroBody: 'Your account connects donations, library activity, and future mandir interactions to a single calm dashboard.',
      profileReady: 'Profile Ready',
      profileReadyBody: 'Use this profile for donations, saved ebooks, and future family-linked features.',
      whatsappFormat: 'WhatsApp Verified Format',
      whatsappFormatBody: 'Enter your number in +91XXXXXXXXXX format for a clean and consistent account setup.',
      fullName: 'Full Name',
      gotra: 'Gotra',
      email: 'Email',
      whatsapp: 'WhatsApp (+91...)',
      address: 'Address',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      whatsappPlaceholder: '+919876543210',
      creating: 'Creating...',
      createAccount: 'Create Account',
      registered: 'Already registered?',
      login: 'Login',
      passwordLengthError: 'Password must be at least 8 characters.',
      passwordMismatchError: 'Password and confirm password do not match.',
      whatsappError: 'WhatsApp must be in +91XXXXXXXXXX format.',
    },
    hi: {
      eyebrow: 'प्रमाणीकरण',
      title: 'साइनअप',
      description: 'दान, सेव की गई अध्ययन सामग्री और आध्यात्मिक कंटेंट प्रबंधित करने के लिए अपना भक्त खाता बनाएँ।',
      join: 'संघ से जुड़ें',
      heroTitle: 'ऐसी प्रोफाइल बनाएँ जिसमें सेवा, अध्ययन और परिवार की जानकारी एक जगह रहे।',
      heroBody: 'आपका अकाउंट दान, लाइब्रेरी गतिविधि और भविष्य की मंदिर सहभागिता को एक शांत डैशबोर्ड से जोड़ता है।',
      profileReady: 'प्रोफाइल तैयार',
      profileReadyBody: 'इस प्रोफाइल का उपयोग दान, सेव की गई ईबुक्स और भविष्य की परिवार-आधारित सुविधाओं के लिए करें।',
      whatsappFormat: 'WhatsApp सत्यापित प्रारूप',
      whatsappFormatBody: 'साफ और एकसमान अकाउंट सेटअप के लिए अपना नंबर +91XXXXXXXXXX प्रारूप में दर्ज करें।',
      fullName: 'पूरा नाम',
      gotra: 'गोत्र',
      email: 'ईमेल',
      whatsapp: 'WhatsApp (+91...)',
      address: 'पता',
      password: 'पासवर्ड',
      confirmPassword: 'पासवर्ड की पुष्टि करें',
      whatsappPlaceholder: '+919876543210',
      creating: 'खाता बन रहा है...',
      createAccount: 'खाता बनाएँ',
      registered: 'पहले से पंजीकृत हैं?',
      login: 'लॉगिन',
      passwordLengthError: 'पासवर्ड कम से कम 8 अक्षरों का होना चाहिए।',
      passwordMismatchError: 'पासवर्ड और कन्फर्म पासवर्ड मेल नहीं खाते।',
      whatsappError: 'WhatsApp +91XXXXXXXXXX प्रारूप में होना चाहिए।',
    },
  })

  function handleChange(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (form.password.length < 8) {
      setError(copy.passwordLengthError)
      return
    }
    if (form.password !== form.confirmPassword) {
      setError(copy.passwordMismatchError)
      return
    }
    if (!/^\+91\d{10}$/.test(form.whatsapp.trim())) {
      setError(copy.whatsappError)
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
    <div className="space-y-6">
      <PageHeader
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
      />

      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="flex flex-col justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-700 dark:text-orange-300">{copy.join}</p>
            <h2 className="mt-2 font-serif text-4xl text-orange-950 dark:text-amber-50">{copy.heroTitle}</h2>
            <p className="mt-4 text-sm leading-8 text-zinc-600 dark:text-zinc-300">
              {copy.heroBody}
            </p>
          </div>

          <div className="mt-8 grid gap-3">
            <div className="rounded-[24px] border border-orange-200/70 bg-white/74 px-4 py-4 dark:border-orange-900/30 dark:bg-white/5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-700 dark:text-orange-300">{copy.profileReady}</p>
              <p className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-300">{copy.profileReadyBody}</p>
            </div>
            <div className="rounded-[24px] border border-orange-200/70 bg-white/74 px-4 py-4 dark:border-orange-900/30 dark:bg-white/5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-700 dark:text-orange-300">{copy.whatsappFormat}</p>
              <p className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-300">{copy.whatsappFormatBody}</p>
            </div>
          </div>
        </Card>

        <Card>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="signup-name" className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-zinc-600 dark:text-zinc-300">
                {copy.fullName}
              </label>
              <input
                id="signup-name"
                value={form.fullName}
                onChange={(event) => handleChange('fullName', event.target.value)}
                className="focus-ring w-full rounded-[20px] border border-orange-200/80 bg-white/80 px-4 py-3 text-sm dark:border-orange-900/40 dark:bg-zinc-900/70"
                required
              />
            </div>

            <div>
              <label htmlFor="signup-gotra" className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-zinc-600 dark:text-zinc-300">
                {copy.gotra}
              </label>
              <input
                id="signup-gotra"
                value={form.gotra}
                onChange={(event) => handleChange('gotra', event.target.value)}
                className="focus-ring w-full rounded-[20px] border border-orange-200/80 bg-white/80 px-4 py-3 text-sm dark:border-orange-900/40 dark:bg-zinc-900/70"
                required
              />
            </div>

            <div>
              <label htmlFor="signup-email" className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-zinc-600 dark:text-zinc-300">
                {copy.email}
              </label>
              <input
                id="signup-email"
                type="email"
                value={form.email}
                onChange={(event) => handleChange('email', event.target.value)}
                className="focus-ring w-full rounded-[20px] border border-orange-200/80 bg-white/80 px-4 py-3 text-sm dark:border-orange-900/40 dark:bg-zinc-900/70"
                required
              />
            </div>

            <div>
              <label htmlFor="signup-whatsapp" className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-zinc-600 dark:text-zinc-300">
                {copy.whatsapp}
              </label>
              <input
                id="signup-whatsapp"
                value={form.whatsapp}
                onChange={(event) => handleChange('whatsapp', event.target.value)}
                className="focus-ring w-full rounded-[20px] border border-orange-200/80 bg-white/80 px-4 py-3 text-sm dark:border-orange-900/40 dark:bg-zinc-900/70"
                placeholder={copy.whatsappPlaceholder}
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="signup-address" className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-zinc-600 dark:text-zinc-300">
                {copy.address}
              </label>
              <input
                id="signup-address"
                value={form.address}
                onChange={(event) => handleChange('address', event.target.value)}
                className="focus-ring w-full rounded-[20px] border border-orange-200/80 bg-white/80 px-4 py-3 text-sm dark:border-orange-900/40 dark:bg-zinc-900/70"
                required
              />
            </div>

            <div>
              <label htmlFor="signup-password" className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-zinc-600 dark:text-zinc-300">
                {copy.password}
              </label>
              <input
                id="signup-password"
                type="password"
                value={form.password}
                onChange={(event) => handleChange('password', event.target.value)}
                className="focus-ring w-full rounded-[20px] border border-orange-200/80 bg-white/80 px-4 py-3 text-sm dark:border-orange-900/40 dark:bg-zinc-900/70"
                required
              />
            </div>

            <div>
              <label htmlFor="signup-confirm" className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-zinc-600 dark:text-zinc-300">
                {copy.confirmPassword}
              </label>
              <input
                id="signup-confirm"
                type="password"
                value={form.confirmPassword}
                onChange={(event) => handleChange('confirmPassword', event.target.value)}
                className="focus-ring w-full rounded-[20px] border border-orange-200/80 bg-white/80 px-4 py-3 text-sm dark:border-orange-900/40 dark:bg-zinc-900/70"
                required
              />
            </div>

            {error && (
              <p className="sm:col-span-2 rounded-[18px] bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-950/35 dark:text-red-200">
                {error}
              </p>
            )}

            <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={working}
                className="focus-ring rounded-full bg-[linear-gradient(135deg,#c2410c,#f59e0b)] px-6 py-3 text-sm font-bold text-white shadow-[0_16px_28px_rgba(194,65,12,0.24)] transition hover:brightness-105 disabled:opacity-70"
              >
                {working ? copy.creating : copy.createAccount}
              </button>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                {copy.registered}{' '}
                <Link to="/login" className="font-semibold text-orange-700 dark:text-orange-300">
                  {copy.login}
                </Link>
              </p>
            </div>
          </form>
        </Card>
      </section>
    </div>
  )
}
