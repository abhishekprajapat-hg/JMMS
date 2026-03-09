import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { usePortal } from '../context/usePortal'

function navClassName({ isActive }) {
  return `top-nav-link${isActive ? ' active' : ''}`
}

export function SiteLayout() {
  const navigate = useNavigate()
  const {
    notice,
    clearNotice,
    mandirs,
    selectedMandirId,
    isAuthenticated,
    userData,
    logout,
  } = usePortal()

  const selectedMandir = mandirs.find((mandir) => mandir.id === selectedMandirId) || mandirs[0] || null
  const sessionBadge = isAuthenticated
    ? `Signed In${userData?.summary?.family?.familyId ? `: ${userData.summary.family.familyId}` : ''}`
    : 'Guest Access'

  return (
    <div className="site-shell min-h-screen">
      <header className="nav-shell">
        <nav className="top-nav" aria-label="Primary navigation">
          <div className="top-nav-group">
            <NavLink to="/" className={navClassName} end>Home</NavLink>
            <NavLink to="/ebooks" className={navClassName}>Ebooks</NavLink>
            <NavLink to="/videos" className={navClassName}>Videos</NavLink>
            <NavLink to="/about" className={navClassName}>About Mandir</NavLink>
            {isAuthenticated && (
              <>
                <NavLink to="/donation" className={navClassName}>Donation</NavLink>
                <NavLink to="/pooja-schedule" className={navClassName}>Pooja Schedule</NavLink>
              </>
            )}
          </div>

          <div className="top-nav-group top-nav-group-auth">
            {isAuthenticated ? (
              <>
                <NavLink to="/profile" className={navClassName}>My Profile</NavLink>
                <button
                  type="button"
                  className="top-nav-link logout-link"
                  onClick={() => {
                    logout({ withNotice: true })
                    navigate('/')
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={navClassName}>Login</NavLink>
                <NavLink to="/register" className={navClassName}>Register</NavLink>
              </>
            )}
          </div>
        </nav>
      </header>

      {notice.text && (
        <div className={`notice ${notice.type} backdrop-blur-sm`}>
          <span>{notice.text}</span>
          <button type="button" className="notice-close flex items-center justify-center" onClick={clearNotice}>x</button>
        </div>
      )}

      <main className="page-content pb-2">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="site-footer-info">
          <p className="eyebrow">Jain Mandir Digital Portal</p>
          <strong className="footer-title">{selectedMandir?.name || 'Jain Mandir'}</strong>
          <p className="footer-address">{selectedMandir?.address || 'Welcome to our community portal.'}</p>
          <div className="hero-badges items-center">
            <span className="hero-badge">Single Mandir Portal</span>
            <span className="hero-badge">{sessionBadge}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
