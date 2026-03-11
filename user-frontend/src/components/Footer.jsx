import { Link } from 'react-router-dom'

const socialLinks = [
  { label: 'Instagram', href: 'https://instagram.com' },
  { label: 'YouTube', href: 'https://youtube.com' },
  { label: 'Facebook', href: 'https://facebook.com' },
]

export function Footer() {
  return (
    <footer className="mt-8 border-t border-orange-100/80 bg-white/90 py-8 dark:border-orange-900/30 dark:bg-zinc-950/85">
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div>
          <h3 className="font-serif text-xl text-orange-900 dark:text-orange-100">Jain Mandir Seva Portal</h3>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            A peaceful digital space for darshan, seva, learning, and community updates.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-bold uppercase tracking-[0.14em] text-orange-700 dark:text-orange-300">Contact</h4>
          <ul className="mt-2 space-y-1 text-sm text-zinc-600 dark:text-zinc-300">
            <li>Shri Jain Mandir, Main Road</li>
            <li>Ahmedabad, Gujarat</li>
            <li>+91 98765 43210</li>
            <li>support@jainmandir.org</li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold uppercase tracking-[0.14em] text-orange-700 dark:text-orange-300">Quick Links</h4>
          <ul className="mt-2 space-y-1 text-sm text-zinc-600 dark:text-zinc-300">
            <li><Link className="hover:text-orange-700" to="/donate">Donate</Link></li>
            <li><Link className="hover:text-orange-700" to="/ebooks">Ebooks</Link></li>
            <li><Link className="hover:text-orange-700" to="/videos">Videos</Link></li>
            <li><Link className="hover:text-orange-700" to="/calendar">Jain Calendar</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold uppercase tracking-[0.14em] text-orange-700 dark:text-orange-300">Social Media</h4>
          <ul className="mt-2 space-y-1 text-sm text-zinc-600 dark:text-zinc-300">
            {socialLinks.map((social) => (
              <li key={social.label}>
                <a
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-orange-700"
                >
                  {social.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
        (c) {new Date().getFullYear()} Jain Mandir. Built with devotion and care.
      </p>
    </footer>
  )
}

