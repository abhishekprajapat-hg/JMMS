import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { pickByLanguage } from '../utils/i18n'

function isValidUrl(value) {
  return /^https?:\/\//i.test(String(value || '').trim())
}

function splitAddress(address, fallbackLine1, fallbackLine2) {
  const parts = String(address || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

  if (!parts.length) {
    return [fallbackLine1, fallbackLine2].filter(Boolean)
  }

  if (parts.length === 1) return [parts[0]]

  return [
    parts.slice(0, -1).join(', '),
    parts[parts.length - 1],
  ].filter(Boolean)
}

function pickFirstValue(sources, keys) {
  for (const source of sources) {
    if (!source || typeof source !== 'object') continue
    for (const key of keys) {
      const value = String(source[key] || '').trim()
      if (value) return value
    }
  }
  return ''
}

function normalizeSocialLinks(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') {
          return {
            label: item,
            href: item,
          }
        }

        return {
          label: item?.label || item?.name || item?.platform || '',
          href: item?.href || item?.url || '',
        }
      })
      .filter((item) => item.label && isValidUrl(item.href))
  }

  if (value && typeof value === 'object') {
    return Object.entries(value)
      .map(([label, href]) => ({
        label,
        href: typeof href === 'string' ? href : href?.url || href?.href || '',
      }))
      .filter((item) => item.label && isValidUrl(item.href))
  }

  return []
}

function pickSocialLinks(...candidates) {
  for (const candidate of candidates) {
    const links = normalizeSocialLinks(candidate)
    if (links.length) return links
  }
  return []
}

export function Footer() {
  const { language, mandirProfile, homeData } = useApp()

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

  const brandLabel = mandirProfile?.name || copy.brand
  const addressLines = splitAddress(mandirProfile?.address, copy.addressLine1, copy.addressLine2)
  const contactSources = [mandirProfile, homeData]
  const email = pickFirstValue(contactSources, ['email', 'contactEmail', 'supportEmail'])
  const phone = pickFirstValue(contactSources, ['phone', 'mobile', 'contactPhone', 'supportPhone'])
  const socialLinks = pickSocialLinks(
    mandirProfile?.socialLinks,
    mandirProfile?.social,
    homeData?.socialLinks,
    homeData?.social,
  )
  const hasSocialLinks = socialLinks.length > 0

  return (
    <footer className="relative mt-12 border-t border-orange-100/80 bg-[linear-gradient(180deg,rgba(255,252,247,0.82),rgba(255,243,226,0.94))] py-10 dark:border-orange-900/30 dark:bg-[linear-gradient(180deg,rgba(13,10,9,0.86),rgba(24,19,16,0.96))]">
      <div className={`mx-auto grid w-full max-w-[1380px] gap-6 px-4 sm:px-6 lg:px-8 ${hasSocialLinks ? 'lg:grid-cols-[1.2fr_0.9fr_0.9fr_0.9fr]' : 'lg:grid-cols-[1.2fr_0.9fr_0.9fr]'}`}>
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
            {addressLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
            {phone ? <li>{phone}</li> : null}
            {email ? <li>{email}</li> : null}
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

        {hasSocialLinks && (
          <div className="rounded-[28px] border border-orange-200/60 bg-white/68 p-6 backdrop-blur-xl dark:border-orange-900/30 dark:bg-white/5">
            <h4 className="text-xs font-bold uppercase tracking-[0.18em] text-orange-700 dark:text-orange-300">{copy.social}</h4>
            <div className="mt-4 flex flex-wrap gap-2">
              {socialLinks.map((social) => (
                <a
                  key={`${social.label}-${social.href}`}
                  href={social.href}
                  target="_blank"
                  rel="nofollow noopener noreferrer"
                  className="focus-ring rounded-full border border-orange-200/80 bg-orange-50/80 px-4 py-2 text-sm font-semibold text-orange-900 transition hover:bg-orange-100 dark:border-orange-900/40 dark:bg-orange-950/18 dark:text-orange-200 dark:hover:bg-orange-950/32"
                >
                  {social.label}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      <p className="mx-auto mt-8 w-full max-w-[1380px] px-4 text-center text-xs uppercase tracking-[0.16em] text-zinc-500 sm:px-6 lg:px-8 dark:text-zinc-400">
        (c) {new Date().getFullYear()} {brandLabel}. {copy.footerNote}
      </p>
    </footer>
  )
}
