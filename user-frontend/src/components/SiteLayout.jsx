import { Outlet } from 'react-router-dom'
import { Footer } from './Footer'
import { Navbar } from './Navbar'
import { useApp } from '../context/AppContext'

export function SiteLayout() {
  const { darkMode } = useApp()

  return (
    <div className={`relative min-h-screen overflow-hidden text-zinc-800 dark:text-zinc-100 ${darkMode ? 'dark' : ''}`}>
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="float-orb absolute left-[-8rem] top-[-4rem] h-72 w-72 rounded-full bg-orange-300/18 blur-3xl dark:bg-orange-500/10" />
        <div className="float-orb absolute right-[-6rem] top-24 h-80 w-80 rounded-full bg-amber-300/18 blur-3xl dark:bg-amber-300/10" />
        <div className="float-orb absolute bottom-[-8rem] left-1/3 h-96 w-96 rounded-full bg-rose-200/18 blur-3xl dark:bg-orange-700/10" />
      </div>

      <Navbar />

      <main className="relative z-10 mx-auto w-full max-w-[1380px] px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>

      <Footer />
    </div>
  )
}
