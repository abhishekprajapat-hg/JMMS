import { useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../services/api'
import { formatDate } from '../utils/validation'

function getInitialForm(defaultRole) {
  return {
    fullName: '',
    username: '',
    password: '',
    role: defaultRole,
  }
}

export function StaffModule({ authToken, currentUser, roleConfig, onNotice }) {
  const [users, setUsers] = useState([])
  const [creatableRoles, setCreatableRoles] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(getInitialForm('executive'))

  const roleOptions = useMemo(
    () => creatableRoles.filter((role) => roleConfig[role]),
    [creatableRoles, roleConfig],
  )

  async function loadUsers() {
    if (!authToken) return
    setLoading(true)
    try {
      const response = await apiRequest('/system/users', {
        token: authToken,
      })
      setUsers(response.users || [])
      const nextRoles = (response.creatableRoles || []).filter(Boolean)
      setCreatableRoles(nextRoles)
      if (nextRoles.length) {
        setForm((current) => ({
          ...current,
          role: nextRoles.includes(current.role) ? current.role : nextRoles[0],
        }))
      }
    } catch (error) {
      onNotice('error', error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken])

  async function handleCreateUser(event) {
    event.preventDefault()
    setSaving(true)
    try {
      const payload = {
        fullName: form.fullName.trim(),
        username: form.username.trim().toLowerCase(),
        password: form.password,
        role: form.role,
      }

      const response = await apiRequest('/system/users', {
        method: 'POST',
        token: authToken,
        body: payload,
      })

      setUsers((current) => [response.user, ...current])
      setForm((current) => ({
        ...getInitialForm(current.role),
        role: current.role,
      }))
      onNotice('success', `User ${response.user.username} created.`)
    } catch (error) {
      onNotice('error', error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="panel-grid two-column">
      <article className="panel">
        <div className="panel-head">
          <h2>Staff User Access</h2>
          <p>Create privileged users for accounting and operations.</p>
        </div>

        <form className="stack-form" onSubmit={handleCreateUser}>
          <h3>Create User</h3>
          <label>
            Full Name
            <input
              value={form.fullName}
              onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
              disabled={saving || loading}
            />
          </label>

          <label>
            Username
            <input
              value={form.username}
              onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
              placeholder="e.g. accounts.punyanidhi"
              disabled={saving || loading}
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              placeholder="Minimum 8 characters"
              disabled={saving || loading}
            />
          </label>

          <label>
            Role
            <select
              value={form.role}
              onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
              disabled={saving || loading}
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {roleConfig[role]?.label || role}
                </option>
              ))}
            </select>
          </label>

          <p className="hint">
            Logged in as {currentUser?.username || '-'} ({roleConfig[currentUser?.role]?.label || currentUser?.role}).
          </p>

          <div className="action-row">
            <button type="submit" disabled={saving || loading || !roleOptions.length}>
              {saving ? 'Creating...' : 'Create User'}
            </button>
            <button
              type="button"
              className="secondary-btn"
              onClick={loadUsers}
              disabled={saving || loading}
            >
              Refresh
            </button>
          </div>
        </form>
      </article>

      <article className="panel">
        <div className="panel-head">
          <h2>Existing Staff Users</h2>
          <p>Only users visible to your role are listed.</p>
        </div>

        <div className="table-wrap compact">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Full Name</th>
                <th>Username</th>
                <th>Role</th>
                <th>Mandir</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr>
                  <td colSpan="6">{loading ? 'Loading users...' : 'No users available.'}</td>
                </tr>
              )}
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.fullName || '-'}</td>
                  <td>{user.username}</td>
                  <td>{roleConfig[user.role]?.label || user.role}</td>
                  <td>{user.mandirId || 'Global'}</td>
                  <td>{formatDate(user.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  )
}
