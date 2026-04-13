import { useEffect, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { toAbsoluteUrl } from '../api'
import { useApp } from '../context/AppContext'
import {
  DEFAULT_OG_IMAGE,
  DEFAULT_SITE_NAME,
  DEFAULT_SITE_URL,
  getSeoConfig,
  normalizeSiteUrl,
} from '../seo/siteSeo'

function readImageUrl(candidate) {
  if (!candidate) return ''
  if (typeof candidate === 'string') return toAbsoluteUrl(candidate)

  const value =
    candidate.image ||
    candidate.src ||
    candidate.url ||
    candidate.photo ||
    candidate.thumbnailUrl ||
    candidate.coverUrl ||
    ''

  return toAbsoluteUrl(value)
}

function pickSeoImage(homeData, mandirProfile) {
  const collections = [
    mandirProfile?.heroImages,
    mandirProfile?.galleryImages,
    mandirProfile?.images,
    mandirProfile?.photos,
    homeData?.heroImages,
    homeData?.galleryImages,
    homeData?.images,
    homeData?.photos,
    homeData?.gallery,
    homeData?.banners,
  ]

  for (const collection of collections) {
    if (!Array.isArray(collection)) continue
    for (const item of collection) {
      const imageUrl = readImageUrl(item)
      if (imageUrl) return imageUrl
    }
  }

  return DEFAULT_OG_IMAGE
}

function upsertMeta(attributeName, attributeValue, content) {
  const selector = `meta[${attributeName}="${attributeValue}"]`
  const existing = document.head.querySelector(selector)

  if (!content) {
    existing?.remove()
    return
  }

  const element = existing || document.createElement('meta')
  element.setAttribute(attributeName, attributeValue)
  element.setAttribute('content', content)

  if (!existing) {
    document.head.appendChild(element)
  }
}

function upsertLink(rel, href) {
  const selector = `link[rel="${rel}"]`
  const existing = document.head.querySelector(selector)

  if (!href) {
    existing?.remove()
    return
  }

  const element = existing || document.createElement('link')
  element.setAttribute('rel', rel)
  element.setAttribute('href', href)

  if (!existing) {
    document.head.appendChild(element)
  }
}

function replaceStructuredDataScripts(schemas) {
  document.head
    .querySelectorAll('script[data-punyanidhi-seo="structured-data"]')
    .forEach((script) => script.remove())

  schemas.forEach((schema) => {
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.dataset.punyanidhiSeo = 'structured-data'
    script.text = JSON.stringify(schema)
    document.head.appendChild(script)
  })
}

export function SeoManager() {
  const location = useLocation()
  const { language, mandirProfile, homeData } = useApp()

  const seo = useMemo(() => {
    const siteUrl =
      typeof window !== 'undefined' && window.location?.origin
        ? normalizeSiteUrl(window.location.origin)
        : normalizeSiteUrl(import.meta.env.VITE_SITE_URL || DEFAULT_SITE_URL)

    const siteName = mandirProfile?.name || DEFAULT_SITE_NAME
    const image = pickSeoImage(homeData, mandirProfile)

    return getSeoConfig({
      pathname: location.pathname,
      language,
      siteUrl,
      siteName,
      address: mandirProfile?.address || '',
      image,
    })
  }, [homeData, language, location.pathname, mandirProfile])

  useEffect(() => {
    document.title = seo.title

    upsertMeta('name', 'description', seo.description)
    upsertMeta('name', 'keywords', seo.keywords)
    upsertMeta('name', 'robots', seo.robots)
    upsertMeta('name', 'googlebot', seo.robots)
    upsertMeta('property', 'og:type', 'website')
    upsertMeta('property', 'og:title', seo.title)
    upsertMeta('property', 'og:description', seo.description)
    upsertMeta('property', 'og:url', seo.canonicalUrl)
    upsertMeta('property', 'og:site_name', mandirProfile?.name || DEFAULT_SITE_NAME)
    upsertMeta('property', 'og:locale', seo.localeCode)
    upsertMeta('property', 'og:image', seo.image)
    upsertMeta('property', 'og:image:alt', seo.imageAlt)
    upsertMeta('name', 'twitter:card', 'summary_large_image')
    upsertMeta('name', 'twitter:title', seo.title)
    upsertMeta('name', 'twitter:description', seo.description)
    upsertMeta('name', 'twitter:image', seo.image)
    upsertLink('canonical', seo.canonicalUrl)
    replaceStructuredDataScripts(seo.structuredData)
  }, [mandirProfile?.name, seo])

  return null
}
