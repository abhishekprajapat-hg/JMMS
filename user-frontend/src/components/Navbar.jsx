import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

const navItems = [
  { label: 'Home', to: '/', end: true },
  { label: 'Donate', to: '/donate' },
  { label: 'Ebooks', to: '/ebooks' },
  { label: 'Videos', to: '/videos' },
  { label: 'Tithi Darpan', to: '/calendar' },
  { label: 'About Mandir', to: '/about' },
  { label: 'Profile', to: '/profile' },
]

function navClass({ isActive }) {
  return `focus-ring rounded-full px-3 py-2 text-sm font-semibold transition ${
    isActive
      ? 'bg-orange-600 text-white shadow-sm'
      : 'text-zinc-700 hover:bg-orange-50 dark:text-zinc-100 dark:hover:bg-zinc-800'
  }`
}

export function Navbar() {
  const navigate = useNavigate()
  const { currentUser, isAuthenticated, logout, darkMode, toggleDarkMode } = useApp()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  function handleSearchSubmit(event) {
    event.preventDefault()
    const trimmed = searchQuery.trim()
    navigate(`/ebooks${trimmed ? `?search=${encodeURIComponent(trimmed)}` : ''}`)
    setIsMobileOpen(false)
  }

  return (
    <header className="sticky top-0 z-40 border-b border-orange-100/80 bg-white/95 backdrop-blur dark:border-orange-900/30 dark:bg-zinc-950/95">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="focus-ring mr-auto flex min-w-0 items-center gap-2 rounded-full pr-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-orange-600 to-amber-400 text-base font-bold text-white shadow">
            {'\u0950'}
          </span>
          <div className="min-w-0">
            <p className="truncate font-serif text-lg text-orange-900 dark:text-orange-100">Jain Mandir</p>
            <p className="-mt-0.5 truncate text-[11px] uppercase tracking-[0.14em] text-orange-700 dark:text-orange-300">
              Ahimsa | Sanyam | Seva
            </p>
          </div>
        </Link>

        <button
          type="button"
          onClick={toggleDarkMode}
          className="focus-ring hidden rounded-full border border-orange-200 px-3 py-2 text-xs font-bold text-zinc-700 transition hover:bg-orange-50 dark:border-orange-900/40 dark:text-zinc-100 dark:hover:bg-zinc-800 sm:inline-flex"
          aria-label="Toggle dark mode"
        >
          {darkMode ? 'Light' : 'Dark'}
        </button>

        <button
          type="button"
          onClick={() => setIsMobileOpen((current) => !current)}
          className="focus-ring inline-flex rounded-full border border-orange-200 px-3 py-2 text-xs font-bold text-zinc-700 transition hover:bg-orange-50 dark:border-orange-900/40 dark:text-zinc-100 dark:hover:bg-zinc-800 lg:hidden"
          aria-expanded={isMobileOpen}
          aria-controls="mobile-menu"
        >
          Menu
        </button>
      </div>

      <div className="hidden border-t border-orange-100/80 px-4 py-2 dark:border-orange-900/30 lg:block">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-3 sm:px-2">
          <nav className="flex flex-wrap items-center gap-1" aria-label="Primary navigation">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={navClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <form onSubmit={handleSearchSubmit} className="ml-auto flex items-center gap-2">
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="focus-ring w-56 rounded-full border border-orange-200 bg-white px-4 py-2 text-sm text-zinc-700 placeholder:text-zinc-400 dark:border-orange-900/40 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
              placeholder="Search books or topics"
              aria-label="Search"
            />
            <button
              type="submit"
              className="focus-ring rounded-full bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105"
            >
              Search
            </button>
          </form>

          {isAuthenticated ? (
            <div className="ml-2 flex items-center gap-2">
              <span className="hidden text-sm font-semibold text-zinc-700 dark:text-zinc-200 xl:inline">
                {currentUser?.name}
              </span>
              <button
                type="button"
                onClick={logout}
                className="focus-ring rounded-full border border-orange-300 px-3 py-2 text-xs font-bold text-orange-800 transition hover:bg-orange-50 dark:border-orange-800 dark:text-orange-200 dark:hover:bg-zinc-800"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="ml-2 flex items-center gap-2">
              <Link to="/login" className="focus-ring rounded-full px-3 py-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                Login
              </Link>
              <Link
                to="/signup"
                className="focus-ring rounded-full bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105"
              >
                Signup
              </Link>
            </div>
          )}
        </div>
      </div>

      <div
        id="mobile-menu"
        className={`border-t border-orange-100/80 px-4 pb-4 dark:border-orange-900/30 lg:hidden ${isMobileOpen ? 'block' : 'hidden'}`}
      >
        <nav className="mt-3 grid gap-1" aria-label="Mobile navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={navClass}
              onClick={() => setIsMobileOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <form onSubmit={handleSearchSubmit} className="mt-3 flex items-center gap-2">
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="focus-ring w-full rounded-full border border-orange-200 bg-white px-4 py-2 text-sm text-zinc-700 placeholder:text-zinc-400 dark:border-orange-900/40 dark:bg-zinc-900 dark:text-zinc-100"
            placeholder="Search books or topics"
            aria-label="Search content"
          />
          <button
            type="submit"
            className="focus-ring rounded-full bg-orange-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Go
          </button>
        </form>

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={toggleDarkMode}
            className="focus-ring rounded-full border border-orange-200 px-3 py-2 text-xs font-bold text-zinc-700 dark:border-orange-900/40 dark:text-zinc-100"
          >
            {darkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
          {isAuthenticated && (
            <button
              type="button"
              onClick={() => {
                logout()
                setIsMobileOpen(false)
              }}
              className="focus-ring rounded-full border border-orange-300 px-3 py-2 text-xs font-bold text-orange-800 dark:border-orange-800 dark:text-orange-200"
            >
              Logout
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
