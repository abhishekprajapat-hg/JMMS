import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { usePortal } from '../context/usePortal'

export function RegisterPage() {
  const navigate = useNavigate()
  const { signUp, working, showNotice } = usePortal()
  const [form, setForm] = useState({
    fullName: '',
    gotra: '',
    whatsapp: '',
    address: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  async function handleSubmit(event) {
    event.preventDefault()
    if (!form.fullName || !form.gotra || !form.whatsapp || !form.address || !form.password) {
      showNotice('error', 'Full name, gotra, WhatsApp, address, and password are required.')
      return
    }
    if (form.password.length < 8) {
      showNotice('error', 'Password must be at least 8 characters.')
      return
    }
    if (form.password !== form.confirmPassword) {
      showNotice('error', 'Password and confirm password do not match.')
      return
    }

    const response = await signUp({
      fullName: form.fullName,
      gotra: form.gotra,
      whatsapp: form.whatsapp,
      address: form.address,
      email: form.email,
      password: form.password,
    })
    if (response) {
      navigate('/profile', { replace: true })
    }
  }

  return (
    <section className="panel auth-panel ring-1 ring-amber-100/60">
      <div className="panel-head space-y-1">
        <h2>Register</h2>
        <p>Create your devotee account for the mandir.</p>
      </div>

      <form className="stack-form" onSubmit={handleSubmit}>
        <label>
          Full Name
          <input
            value={form.fullName}
            onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
          />
        </label>
        <label>
          Gotra
          <input
            value={form.gotra}
            onChange={(event) => setForm((current) => ({ ...current, gotra: event.target.value }))}
          />
        </label>
        <label>
          WhatsApp (+91XXXXXXXXXX)
          <input
            value={form.whatsapp}
            onChange={(event) => setForm((current) => ({ ...current, whatsapp: event.target.value }))}
            placeholder="+919876543210"
          />
        </label>
        <label>
          Address
          <input
            value={form.address}
            onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
          />
        </label>
        <label>
          Email (optional)
          <input
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            placeholder="email@example.com"
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
        <label>
          Confirm Password
          <input
            type="password"
            value={form.confirmPassword}
            onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
          />
        </label>
        <button className="w-full sm:w-auto" type="submit" disabled={working}>Create Account</button>
      </form>

      <p className="auth-alt">
        Already registered? <Link to="/login">Sign in</Link>
      </p>
    </section>
  )
}
