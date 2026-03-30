import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  DEFAULT_SITE_URL,
  INDEXABLE_ROUTES,
  buildUrl,
  normalizeSiteUrl,
} from '../src/seo/siteSeo.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const publicDir = path.join(projectRoot, 'public')

function readEnvValue(filePath, key) {
  if (!fs.existsSync(filePath)) return ''

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex < 0) continue

    const entryKey = trimmed.slice(0, separatorIndex).trim()
    if (entryKey !== key) continue

    return trimmed
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '')
  }

  return ''
}

const siteUrl = normalizeSiteUrl(
  process.env.VITE_SITE_URL ||
    readEnvValue(path.join(projectRoot, '.env'), 'VITE_SITE_URL') ||
    readEnvValue(path.join(projectRoot, '.env.example'), 'VITE_SITE_URL') ||
    DEFAULT_SITE_URL,
)

const today = new Date().toISOString().slice(0, 10)

const robotsContent = [
  'User-agent: *',
  'Allow: /',
  '',
  'Disallow: /login',
  'Disallow: /signup',
  'Disallow: /register',
  'Disallow: /forgot-password',
  'Disallow: /profile',
  'Disallow: /donation',
  'Disallow: /events',
  '',
  `Sitemap: ${buildUrl(siteUrl, '/sitemap.xml')}`,
  '',
].join('\n')

const sitemapEntries = INDEXABLE_ROUTES.map(
  ({ path: routePath, changefreq, priority }) => `  <url>
    <loc>${buildUrl(siteUrl, routePath)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`,
).join('\n')

const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries}
</urlset>
`

fs.mkdirSync(publicDir, { recursive: true })
fs.writeFileSync(path.join(publicDir, 'robots.txt'), robotsContent, 'utf8')
fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemapContent, 'utf8')

console.log(`Generated robots.txt and sitemap.xml for ${siteUrl}`)
