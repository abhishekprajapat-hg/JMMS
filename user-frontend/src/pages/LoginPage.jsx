import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { usePortal } from '../context/usePortal'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { signIn, working, showNotice } = usePortal()
  const [form, setForm] = useState({
    identifier: '',
    password: '',
  })

  async function handleSubmit(event) {
    event.preventDefault()
    if (!form.identifier || !form.password) {
      showNotice('error', 'Identifier and password are required.')
      return
    }

    const response = await signIn(form)
    if (response) {
      const redirectTo = location.state?.from || '/profile'
      navigate(redirectTo, { replace: true })
    }
  }

  return (
    <section className="panel auth-panel ring-1 ring-amber-100/60">
      <div className="panel-head space-y-1">
        <h2>Login</h2>
        <p>Sign in with Email, WhatsApp, or Family ID and your password.</p>
      </div>

      <form className="stack-form" onSubmit={handleSubmit}>
        <label>
          Identifier
          <input
            value={form.identifier}
            onChange={(event) => setForm((current) => ({ ...current, identifier: event.target.value }))}
            placeholder="email@example.com or +919876543210 or FAM-0001"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={form.password}
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
          />
        </label>
        <button className="w-full sm:w-auto" type="submit" disabled={working}>Sign In</button>
      </form>

      <p className="auth-alt">
        New devotee? <Link to="/register">Create account</Link>
      </p>
    </section>
  )
}
