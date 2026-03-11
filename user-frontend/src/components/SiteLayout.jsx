import { Outlet } from 'react-router-dom'
import { Footer } from './Footer'
import { Navbar } from './Navbar'
import { useApp } from '../context/AppContext'

export function SiteLayout() {
  const { darkMode } = useApp()

  return (
    <div className={`min-h-screen bg-gradient-to-b from-orange-50/70 via-white to-amber-50/60 text-zinc-800 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900 dark:text-zinc-100 ${darkMode ? 'dark' : ''}`}>
      <Navbar />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
