export const DEFAULT_SITE_URL = 'https://nemnidhi.tech'
export const DEFAULT_SITE_NAME = 'PUNYANIDHI'
export const DEFAULT_OG_IMAGE = 'https://commons.wikimedia.org/wiki/Special:FilePath/Jain%20Temple.jpg'

export const INDEXABLE_ROUTES = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/about', changefreq: 'monthly', priority: '0.7' },
  { path: '/donate', changefreq: 'weekly', priority: '0.8' },
  { path: '/ebooks', changefreq: 'weekly', priority: '0.8' },
  { path: '/videos', changefreq: 'weekly', priority: '0.8' },
  { path: '/calendar', changefreq: 'daily', priority: '0.9' },
]

const ROUTE_ALIASES = new Map([
  ['/donation', '/donate'],
  ['/events', '/calendar'],
  ['/register', '/signup'],
])

const INDEX_ROBOTS = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
const NOINDEX_ROBOTS = 'noindex, nofollow, noarchive'

export function normalizeSiteUrl(siteUrl = '') {
  const fallbackUrl = DEFAULT_SITE_URL
  const value = String(siteUrl || '').trim()
  if (!value) return fallbackUrl

  try {
    const parsed = new URL(value)
    return parsed.origin.replace(/\/+$/, '')
  } catch {
    return fallbackUrl
  }
}

export function normalizePathname(pathname = '/') {
  const rawValue = String(pathname || '/').trim()
  if (!rawValue) return '/'

  const withLeadingSlash = rawValue.startsWith('/') ? rawValue : `/${rawValue}`
  const normalized = withLeadingSlash.replace(/\/{2,}/g, '/')
  if (normalized === '/') return normalized
  return normalized.replace(/\/+$/, '') || '/'
}

export function buildUrl(siteUrl, pathname = '/') {
  const normalizedSiteUrl = normalizeSiteUrl(siteUrl)
  const normalizedPath = normalizePathname(pathname)
  return normalizedPath === '/' ? `${normalizedSiteUrl}/` : `${normalizedSiteUrl}${normalizedPath}`
}

function resolveCanonicalPath(pathname) {
  const normalizedPath = normalizePathname(pathname)
  return ROUTE_ALIASES.get(normalizedPath) || normalizedPath
}

function resolveRouteKey(pathname) {
  const canonicalPath = resolveCanonicalPath(pathname)

  if (canonicalPath === '/') return 'home'
  if (canonicalPath === '/about') return 'about'
  if (canonicalPath === '/donate') return 'donate'
  if (canonicalPath === '/ebooks') return 'ebooks'
  if (canonicalPath === '/videos') return 'videos'
  if (canonicalPath === '/calendar') return 'calendar'
  if (canonicalPath === '/login') return 'login'
  if (canonicalPath === '/signup') return 'signup'
  if (canonicalPath === '/forgot-password') return 'forgotPassword'
  if (canonicalPath === '/profile') return 'profile'
  return 'notFound'
}

function buildLocationPhrase(address) {
  const value = String(address || '').trim()
  return value ? ` in ${value}` : ''
}

function buildPostalAddress(address) {
  const value = String(address || '').trim()
  if (!value) return undefined
  return {
    '@type': 'PostalAddress',
    streetAddress: value,
  }
}

function buildOrganizationSchema({ siteUrl, siteName, description, address, image }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${siteUrl}/#organization`,
    name: siteName,
    url: `${siteUrl}/`,
    description,
    address: buildPostalAddress(address),
    image,
  }
}

function buildWebSiteSchema({ siteUrl, siteName, description, languageCode }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${siteUrl}/#website`,
    url: `${siteUrl}/`,
    name: siteName,
    description,
    inLanguage: languageCode,
    publisher: {
      '@id': `${siteUrl}/#organization`,
    },
  }
}

function buildWebPageSchema({
  siteUrl,
  title,
  description,
  canonicalUrl,
  languageCode,
  image,
  pageType,
  includeBreadcrumb,
}) {
  return {
    '@context': 'https://schema.org',
    '@type': pageType,
    '@id': `${canonicalUrl}#webpage`,
    url: canonicalUrl,
    name: title,
    description,
    inLanguage: languageCode,
    isPartOf: {
      '@id': `${siteUrl}/#website`,
    },
    about: {
      '@id': `${siteUrl}/#organization`,
    },
    primaryImageOfPage: image
      ? {
          '@type': 'ImageObject',
          url: image,
        }
      : undefined,
    breadcrumb: includeBreadcrumb
      ? {
          '@id': `${canonicalUrl}#breadcrumb`,
        }
      : undefined,
  }
}

function buildBreadcrumbSchema({ siteUrl, canonicalUrl, currentLabel }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `${canonicalUrl}#breadcrumb`,
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: `${siteUrl}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: currentLabel,
        item: canonicalUrl,
      },
    ],
  }
}

function buildRouteDefinition({ routeKey, siteName, address }) {
  const locationPhrase = buildLocationPhrase(address)

  switch (routeKey) {
    case 'about':
      return {
        title: `About ${siteName} | Timings and Community`,
        description: `Learn about ${siteName}${locationPhrase}, daily darshan timings, Jain seva, spiritual programs, and community activities.`,
        keywords: [
          siteName,
          'about jain mandir',
          'jain temple timings',
          'community seva',
          'darshan timings',
        ],
        label: 'About Mandir',
        pageType: 'AboutPage',
        robots: INDEX_ROBOTS,
        indexable: true,
      }
    case 'donate':
      return {
        title: `Donate to ${siteName} | Jain Seva Portal`,
        description: `Support ${siteName}${locationPhrase} with online Jain donations, UPI or bank transfer guidance, and transparent seva records.`,
        keywords: [
          'online jain donation',
          'temple donation',
          'jain seva',
          siteName,
          'mandir donation portal',
        ],
        label: 'Donate',
        pageType: 'WebPage',
        robots: INDEX_ROBOTS,
        indexable: true,
      }
    case 'ebooks':
      return {
        title: `Jain Ebooks Library | ${siteName}`,
        description: `Read Jain scriptures, philosophy, and spiritual study material from the ${siteName} digital ebooks library.`,
        keywords: [
          'jain ebooks',
          'jain scriptures pdf',
          'jain philosophy books',
          siteName,
          'digital library',
        ],
        label: 'Ebooks',
        pageType: 'CollectionPage',
        robots: INDEX_ROBOTS,
        indexable: true,
      }
    case 'videos':
      return {
        title: `Jain Video Library | ${siteName}`,
        description: `Watch Jain pravachan, bhakti, darshan, and spiritual videos curated by ${siteName}.`,
        keywords: [
          'jain videos',
          'pravachan videos',
          'jain bhakti',
          siteName,
          'darshan videos',
        ],
        label: 'Videos',
        pageType: 'CollectionPage',
        robots: INDEX_ROBOTS,
        indexable: true,
      }
    case 'calendar':
      return {
        title: 'Jain Calendar | Tithi, Panchang and Festivals',
        description: `Check daily Jain tithi, Panchang, nakshatra, kalyanak, fasting cues, and festival dates from ${siteName}.`,
        keywords: [
          'jain calendar',
          'jain tithi',
          'jain panchang',
          'jain festivals',
          'kalyanak calendar',
        ],
        label: 'Jain Calendar',
        pageType: 'CollectionPage',
        robots: INDEX_ROBOTS,
        indexable: true,
      }
    case 'login':
      return {
        title: `Login | ${siteName}`,
        description: 'Sign in to your devotee account for donations, profile access, saved study material, and personal activity.',
        keywords: ['devotee login', siteName],
        label: 'Login',
        pageType: 'WebPage',
        robots: NOINDEX_ROBOTS,
        indexable: false,
      }
    case 'signup':
      return {
        title: `Signup | ${siteName}`,
        description: 'Create your devotee account to manage donations, saved ebooks, and spiritual activity in one place.',
        keywords: ['devotee signup', siteName],
        label: 'Signup',
        pageType: 'WebPage',
        robots: NOINDEX_ROBOTS,
        indexable: false,
      }
    case 'forgotPassword':
      return {
        title: `Forgot Password | ${siteName}`,
        description: 'Request an account password reset for your devotee profile and sign-in access.',
        keywords: ['password reset', siteName],
        label: 'Forgot Password',
        pageType: 'WebPage',
        robots: NOINDEX_ROBOTS,
        indexable: false,
      }
    case 'profile':
      return {
        title: `Your Profile | ${siteName}`,
        description: 'Review your devotee profile, donations, receipts, saved books, and watch history.',
        keywords: ['devotee profile', siteName],
        label: 'Profile',
        pageType: 'ProfilePage',
        robots: NOINDEX_ROBOTS,
        indexable: false,
      }
    case 'notFound':
      return {
        title: `Page Not Found | ${siteName}`,
        description: `The page you requested is not available on ${siteName}.`,
        keywords: [siteName, 'page not found'],
        label: 'Page Not Found',
        pageType: 'WebPage',
        robots: NOINDEX_ROBOTS,
        indexable: false,
      }
    case 'home':
    default:
      return {
        title: `${siteName} | Jain Seva, Calendar and Library`,
        description: `Explore ${siteName}${locationPhrase} with online donations, Jain calendar, ebooks, pravachan videos, temple timings, and devotee updates in one place.`,
        keywords: [
          siteName,
          'jain mandir',
          'jain temple',
          'jain calendar',
          'pravachan videos',
          'jain ebooks',
          'online donation',
        ],
        label: 'Home',
        pageType: 'WebPage',
        robots: INDEX_ROBOTS,
        indexable: true,
      }
  }
}

export function getSeoConfig({
  pathname = '/',
  language = 'en',
  siteUrl = DEFAULT_SITE_URL,
  siteName = DEFAULT_SITE_NAME,
  address = '',
  image = DEFAULT_OG_IMAGE,
} = {}) {
  const normalizedSiteUrl = normalizeSiteUrl(siteUrl)
  const canonicalPath = resolveCanonicalPath(pathname)
  const routeKey = resolveRouteKey(pathname)
  const route = buildRouteDefinition({ routeKey, siteName, address })
  const canonicalUrl = buildUrl(normalizedSiteUrl, canonicalPath)
  const languageCode = language === 'hi' ? 'hi-IN' : 'en-IN'
  const localeCode = language === 'hi' ? 'hi_IN' : 'en_IN'

  const structuredData = route.indexable
    ? [
        buildOrganizationSchema({
          siteUrl: normalizedSiteUrl,
          siteName,
          description: route.description,
          address,
          image,
        }),
        buildWebSiteSchema({
          siteUrl: normalizedSiteUrl,
          siteName,
          description: route.description,
          languageCode,
        }),
        buildWebPageSchema({
          siteUrl: normalizedSiteUrl,
          title: route.title,
          description: route.description,
          canonicalUrl,
          languageCode,
          image,
          pageType: route.pageType,
          includeBreadcrumb: routeKey !== 'home',
        }),
        ...(routeKey === 'home'
          ? []
          : [
              buildBreadcrumbSchema({
                siteUrl: normalizedSiteUrl,
                canonicalUrl,
                currentLabel: route.label,
              }),
            ]),
      ]
    : []

  return {
    title: route.title,
    description: route.description,
    keywords: route.keywords.join(', '),
    robots: route.robots,
    canonicalPath,
    canonicalUrl,
    image,
    imageAlt: `${siteName} temple image`,
    localeCode,
    languageCode,
    structuredData,
    routeKey,
    indexable: route.indexable,
  }
}
