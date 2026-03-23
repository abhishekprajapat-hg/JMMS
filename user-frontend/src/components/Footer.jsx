import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { pickByLanguage } from '../utils/i18n'

const socialLinks = [
  { label: 'Instagram', href: 'https://instagram.com' },
  { label: 'YouTube', href: 'https://youtube.com' },
  { label: 'Facebook', href: 'https://facebook.com' },
]

export function Footer() {
  const { language } = useApp()

  const copy = pickByLanguage(language, {
    en: {
      brand: 'Jain Mandir',
      eyebrow: 'Jain Mandir Seva Portal',
      title: 'A digital mandir with warmth, rhythm, and seva at its center.',
      description: 'Darshan, learning, donations, tithi awareness, and community life brought together in one serene spiritual interface.',
      contact: 'Contact',
      quickLinks: 'Quick Links',
      social: 'Social',
      addressLine1: 'Shri Jain Mandir, Main Road',
      addressLine2: 'Ahmedabad, Gujarat',
      footerNote: 'Designed with devotion and care.',
      links: [
        { label: 'Donate', to: '/donate' },
        { label: 'Ebooks', to: '/ebooks' },
        { label: 'Videos', to: '/videos' },
        { label: 'Jain Calendar', to: '/calendar' },
      ],
    },
    hi: {
      brand: 'जैन मंदिर',
      eyebrow: 'जैन मंदिर सेवा पोर्टल',
      title: 'एक डिजिटल मंदिर, जिसके केंद्र में ऊष्मा, लय और सेवा हो।',
      description: 'दर्शन, अध्ययन, दान, तिथि जागरूकता और सामुदायिक जीवन को एक शांत आध्यात्मिक इंटरफेस में साथ लाया गया है।',
      contact: 'संपर्क',
      quickLinks: 'त्वरित लिंक',
      social: 'सोशल',
      addressLine1: 'श्री जैन मंदिर, मेन रोड',
      addressLine2: 'अहमदाबाद, गुजरात',
      footerNote: 'भक्ति और संवेदनशीलता के साथ तैयार किया गया।',
      links: [
        { label: 'दान', to: '/donate' },
        { label: 'ईबुक्स', to: '/ebooks' },
        { label: 'वीडियो', to: '/videos' },
        { label: 'जैन कैलेंडर', to: '/calendar' },
      ],
    },
  })

  return (
    <footer className="relative mt-12 border-t border-orange-100/80 bg-[linear-gradient(180deg,rgba(255,252,247,0.82),rgba(255,243,226,0.94))] py-10 dark:border-orange-900/30 dark:bg-[linear-gradient(180deg,rgba(13,10,9,0.86),rgba(24,19,16,0.96))]">
      <div className="mx-auto grid w-full max-w-[1380px] gap-6 px-4 sm:px-6 lg:grid-cols-[1.2fr_0.9fr_0.9fr_0.9fr] lg:px-8">
        <div className="rounded-[28px] border border-orange-200/70 bg-white/72 p-6 shadow-[0_22px_50px_rgba(132,71,21,0.08)] backdrop-blur-xl dark:border-orange-900/30 dark:bg-white/5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-700 dark:text-orange-300">{copy.eyebrow}</p>
          <h3 className="mt-3 font-serif text-3xl leading-none text-orange-950 dark:text-amber-50">{copy.title}</h3>
          <p className="mt-4 max-w-md text-sm leading-7 text-zinc-600 dark:text-zinc-300">
            {copy.description}
          </p>
        </div>

        <div className="rounded-[28px] border border-orange-200/60 bg-white/68 p-6 backdrop-blur-xl dark:border-orange-900/30 dark:bg-white/5">
          <h4 className="text-xs font-bold uppercase tracking-[0.18em] text-orange-700 dark:text-orange-300">{copy.contact}</h4>
          <ul className="mt-4 space-y-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            <li>{copy.addressLine1}</li>
            <li>{copy.addressLine2}</li>
            <li>+91 98765 43210</li>
            <li>support@jainmandir.org</li>
          </ul>
        </div>

        <div className="rounded-[28px] border border-orange-200/60 bg-white/68 p-6 backdrop-blur-xl dark:border-orange-900/30 dark:bg-white/5">
          <h4 className="text-xs font-bold uppercase tracking-[0.18em] text-orange-700 dark:text-orange-300">{copy.quickLinks}</h4>
          <ul className="mt-4 space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
            {copy.links.map((item) => (
              <li key={item.to}>
                <Link className="transition hover:text-orange-700 dark:hover:text-orange-300" to={item.to}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-[28px] border border-orange-200/60 bg-white/68 p-6 backdrop-blur-xl dark:border-orange-900/30 dark:bg-white/5">
          <h4 className="text-xs font-bold uppercase tracking-[0.18em] text-orange-700 dark:text-orange-300">{copy.social}</h4>
          <div className="mt-4 flex flex-wrap gap-2">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noreferrer"
                className="focus-ring rounded-full border border-orange-200/80 bg-orange-50/80 px-4 py-2 text-sm font-semibold text-orange-900 transition hover:bg-orange-100 dark:border-orange-900/40 dark:bg-orange-950/18 dark:text-orange-200 dark:hover:bg-orange-950/32"
              >
                {social.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      <p className="mx-auto mt-8 w-full max-w-[1380px] px-4 text-center text-xs uppercase tracking-[0.16em] text-zinc-500 sm:px-6 lg:px-8 dark:text-zinc-400">
        (c) {new Date().getFullYear()} {copy.brand}. {copy.footerNote}
      </p>
    </footer>
  )
}
