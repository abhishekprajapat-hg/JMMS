import { useMemo, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { pickByLanguage } from '../utils/i18n'

function navClass({ isActive }) {
  return `focus-ring rounded-full px-4 py-2.5 text-sm font-semibold transition ${
    isActive
      ? 'bg-[linear-gradient(135deg,#c2410c,#f59e0b)] text-white shadow-[0_14px_26px_rgba(194,65,12,0.28)]'
      : 'text-zinc-700 hover:bg-white/70 hover:text-orange-900 dark:text-zinc-100 dark:hover:bg-white/8 dark:hover:text-amber-100'
  }`
}

export function Navbar() {
  const navigate = useNavigate()
  const {
    currentUser,
    isAuthenticated,
    logout,
    darkMode,
    toggleDarkMode,
    language,
    toggleLanguage,
  } = useApp()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const copy = pickByLanguage(language, {
    en: {
      brand: 'Jain Mandir',
      values: ['Ahimsa', 'Sanyam', 'Seva'],
      liveDarshan: 'Live Darshan Ready',
      searchPlaceholder: 'Search books, pravachan, or topics',
      searchButton: 'Search',
      searchAria: 'Search library',
      colorModeAria: 'Toggle color mode',
      light: 'Light',
      dark: 'Dark',
      menu: 'Menu',
      navLabel: 'Primary navigation',
      mobileNavLabel: 'Mobile navigation',
      devotee: 'Devotee',
      logout: 'Logout',
      login: 'Login',
      join: 'Join The Sangh',
      mobileSearchPlaceholder: 'Search books or topics',
      mobileSearchAria: 'Search content',
      mobileSearchButton: 'Go',
      lightMode: 'Light Mode',
      darkMode: 'Dark Mode',
      signup: 'Signup',
      languageButton: 'हिंदी',
      languageAria: 'Switch language to Hindi',
      items: [
        { label: 'Home', to: '/', end: true },
        { label: 'Donate', to: '/donate' },
        { label: 'Ebooks', to: '/ebooks' },
        { label: 'Videos', to: '/videos' },
        { label: 'Tithi Darpan', to: '/calendar' },
        { label: 'About Mandir', to: '/about' },
        { label: 'Profile', to: '/profile' },
      ],
    },
    hi: {
      brand: 'जैन मंदिर',
      values: ['अहिंसा', 'संयम', 'सेवा'],
      liveDarshan: 'लाइव दर्शन तैयार',
      searchPlaceholder: 'किताब, प्रवचन या विषय खोजें',
      searchButton: 'खोजें',
      searchAria: 'लाइब्रेरी खोजें',
      colorModeAria: 'रंग मोड बदलें',
      light: 'लाइट',
      dark: 'डार्क',
      menu: 'मेन्यू',
      navLabel: 'मुख्य नेविगेशन',
      mobileNavLabel: 'मोबाइल नेविगेशन',
      devotee: 'श्रावक',
      logout: 'लॉगआउट',
      login: 'लॉगिन',
      join: 'संघ से जुड़ें',
      mobileSearchPlaceholder: 'किताबें या विषय खोजें',
      mobileSearchAria: 'सामग्री खोजें',
      mobileSearchButton: 'जाएँ',
      lightMode: 'लाइट मोड',
      darkMode: 'डार्क मोड',
      signup: 'साइनअप',
      languageButton: 'English',
      languageAria: 'भाषा अंग्रेज़ी में बदलें',
      items: [
        { label: 'होम', to: '/', end: true },
        { label: 'दान', to: '/donate' },
        { label: 'ईबुक्स', to: '/ebooks' },
        { label: 'वीडियो', to: '/videos' },
        { label: 'तिथि दर्पण', to: '/calendar' },
        { label: 'मंदिर परिचय', to: '/about' },
        { label: 'प्रोफाइल', to: '/profile' },
      ],
    },
  })

  const navItems = useMemo(() => copy.items, [copy.items])

  function handleSearchSubmit(event) {
    event.preventDefault()
    const trimmed = searchQuery.trim()
    navigate(`/ebooks${trimmed ? `?search=${encodeURIComponent(trimmed)}` : ''}`)
    setIsMobileOpen(false)
  }

  return (
    <header className="sticky top-0 z-40 px-4 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1380px]">
        <div className="overflow-hidden rounded-[32px] border border-white/70 bg-white/72 shadow-[0_18px_50px_rgba(132,71,21,0.12)] backdrop-blur-2xl dark:border-white/8 dark:bg-[rgba(18,16,14,0.82)] dark:shadow-[0_22px_60px_rgba(0,0,0,0.35)]">
          <div className="flex items-center gap-3 px-4 py-4 sm:px-5">
            <Link to="/" className="focus-ring mr-auto flex min-w-0 items-center gap-3 rounded-full pr-2">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[linear-gradient(135deg,#c2410c,#f59e0b)] text-xl font-bold text-white shadow-[0_14px_28px_rgba(194,65,12,0.28)]">
                {'\u0950'}
              </span>
              <div className="min-w-0">
                <p className="truncate font-serif text-[1.55rem] leading-none text-orange-950 dark:text-amber-50">{copy.brand}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-orange-700 dark:text-orange-300">
                  {copy.values.map((value, index) => (
                    <span key={value} className="contents">
                      {index > 0 && <span className="h-1 w-1 rounded-full bg-orange-400/70" aria-hidden="true" />}
                      <span>{value}</span>
                    </span>
                  ))}
                </div>
              </div>
            </Link>

            <div className="hidden items-center rounded-full border border-orange-200/80 bg-orange-50/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-800 dark:border-orange-900/40 dark:bg-orange-950/20 dark:text-orange-300 xl:flex">
              {copy.liveDarshan}
            </div>

            <form onSubmit={handleSearchSubmit} className="hidden max-w-md flex-1 items-center gap-2 rounded-full border border-orange-200/80 bg-white/90 px-3 py-2 dark:border-orange-900/40 dark:bg-zinc-950/60 lg:flex">
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="focus-ring min-w-0 flex-1 border-0 bg-transparent px-1 text-sm text-zinc-700 placeholder:text-zinc-400 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                placeholder={copy.searchPlaceholder}
                aria-label={copy.searchAria}
              />
              <button
                type="submit"
                className="focus-ring rounded-full bg-[linear-gradient(135deg,#c2410c,#f59e0b)] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(194,65,12,0.22)] transition hover:brightness-105"
              >
                {copy.searchButton}
              </button>
            </form>

            <button
              type="button"
              onClick={toggleLanguage}
              className="focus-ring hidden rounded-full border border-orange-200/80 bg-white/70 px-4 py-2 text-xs font-bold tracking-[0.08em] text-zinc-700 transition hover:bg-orange-50 dark:border-orange-900/40 dark:bg-zinc-900/70 dark:text-zinc-100 dark:hover:bg-zinc-800 sm:inline-flex"
              aria-label={copy.languageAria}
            >
              {copy.languageButton}
            </button>

            <button
              type="button"
              onClick={toggleDarkMode}
              className="focus-ring hidden rounded-full border border-orange-200/80 bg-white/70 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-zinc-700 transition hover:bg-orange-50 dark:border-orange-900/40 dark:bg-zinc-900/70 dark:text-zinc-100 dark:hover:bg-zinc-800 sm:inline-flex"
              aria-label={copy.colorModeAria}
            >
              {darkMode ? copy.light : copy.dark}
            </button>

            <button
              type="button"
              onClick={() => setIsMobileOpen((current) => !current)}
              className="focus-ring inline-flex rounded-full border border-orange-200/80 bg-white/70 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-zinc-700 transition hover:bg-orange-50 dark:border-orange-900/40 dark:bg-zinc-900/70 dark:text-zinc-100 dark:hover:bg-zinc-800 lg:hidden"
              aria-expanded={isMobileOpen}
              aria-controls="mobile-menu"
            >
              {copy.menu}
            </button>
          </div>

          <div className="hidden items-center gap-3 border-t border-orange-100/80 px-4 py-3 dark:border-orange-900/30 lg:flex">
            <nav className="flex flex-wrap items-center gap-1" aria-label={copy.navLabel}>
              {navItems.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} className={navClass}>
                  {item.label}
                </NavLink>
              ))}
            </nav>

            {isAuthenticated ? (
              <div className="ml-auto flex items-center gap-2">
                <div className="hidden rounded-full border border-orange-200/80 bg-orange-50/80 px-4 py-2 text-sm font-semibold text-orange-900 dark:border-orange-900/40 dark:bg-orange-950/20 dark:text-orange-200 xl:flex">
                  {currentUser?.name || copy.devotee}
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="focus-ring rounded-full border border-orange-300/80 px-4 py-2 text-sm font-semibold text-orange-900 transition hover:bg-orange-50 dark:border-orange-800 dark:text-orange-200 dark:hover:bg-zinc-800"
                >
                  {copy.logout}
                </button>
              </div>
            ) : (
              <div className="ml-auto flex items-center gap-2">
                <Link to="/login" className="focus-ring rounded-full px-4 py-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                  {copy.login}
                </Link>
                <Link
                  to="/signup"
                  className="focus-ring rounded-full bg-[linear-gradient(135deg,#c2410c,#f59e0b)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_14px_26px_rgba(194,65,12,0.28)] transition hover:brightness-105"
                >
                  {copy.join}
                </Link>
              </div>
            )}
          </div>

          <div
            id="mobile-menu"
            className={`border-t border-orange-100/80 px-4 pb-4 dark:border-orange-900/30 lg:hidden ${isMobileOpen ? 'block' : 'hidden'}`}
          >
            <form onSubmit={handleSearchSubmit} className="mt-4 flex items-center gap-2 rounded-[24px] border border-orange-200/80 bg-white/80 p-2 dark:border-orange-900/40 dark:bg-zinc-950/55">
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="focus-ring min-w-0 flex-1 border-0 bg-transparent px-2 text-sm text-zinc-700 placeholder:text-zinc-400 dark:text-zinc-100"
                placeholder={copy.mobileSearchPlaceholder}
                aria-label={copy.mobileSearchAria}
              />
              <button
                type="submit"
                className="focus-ring rounded-full bg-[linear-gradient(135deg,#c2410c,#f59e0b)] px-4 py-2 text-sm font-semibold text-white"
              >
                {copy.mobileSearchButton}
              </button>
            </form>

            <nav className="mt-4 grid gap-2" aria-label={copy.mobileNavLabel}>
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

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={toggleLanguage}
                className="focus-ring rounded-full border border-orange-200/80 bg-white/70 px-4 py-2 text-xs font-bold tracking-[0.08em] text-zinc-700 dark:border-orange-900/40 dark:bg-zinc-900/70 dark:text-zinc-100"
                aria-label={copy.languageAria}
              >
                {copy.languageButton}
              </button>
              <button
                type="button"
                onClick={toggleDarkMode}
                className="focus-ring rounded-full border border-orange-200/80 bg-white/70 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-zinc-700 dark:border-orange-900/40 dark:bg-zinc-900/70 dark:text-zinc-100"
              >
                {darkMode ? copy.lightMode : copy.darkMode}
              </button>
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => {
                    logout()
                    setIsMobileOpen(false)
                  }}
                  className="focus-ring rounded-full border border-orange-300/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-orange-900 dark:border-orange-800 dark:text-orange-200"
                >
                  {copy.logout}
                </button>
              ) : (
                <Link
                  to="/signup"
                  onClick={() => setIsMobileOpen(false)}
                  className="focus-ring rounded-full bg-[linear-gradient(135deg,#c2410c,#f59e0b)] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-white"
                >
                  {copy.signup}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
