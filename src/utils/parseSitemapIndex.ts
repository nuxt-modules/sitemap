import { XMLParser } from 'fast-xml-parser'
import type { SitemapWarning } from './parseSitemapXml'

export interface SitemapIndexEntry {
  loc: string
  lastmod?: string
}

export interface SitemapIndexParseResult {
  entries: SitemapIndexEntry[]
  warnings: SitemapWarning[]
}

interface ParsedSitemap {
  loc?: string
  lastmod?: string
}

interface ParsedSitemapIndex {
  sitemap?: ParsedSitemap | ParsedSitemap[]
}

interface ParsedRoot {
  sitemapindex?: ParsedSitemapIndex
}

const parser = new XMLParser({
  isArray: (tagName: string) => tagName === 'sitemap',
  removeNSPrefix: true,
  trimValues: true,
})

function isValidUrl(value: string): boolean {
  try {
    new URL(value)
    return true
  }
  catch {
    return false
  }
}

export function parseSitemapIndex(xml: string): SitemapIndexParseResult {
  if (!xml)
    throw new Error('Empty XML input provided')

  const parsed = parser.parse(xml) as ParsedRoot

  if (parsed?.sitemapindex === undefined)
    throw new Error('XML does not contain a valid sitemapindex element')

  if (!parsed.sitemapindex || !parsed.sitemapindex.sitemap)
    return { entries: [], warnings: [] }

  const sitemaps = Array.isArray(parsed.sitemapindex.sitemap)
    ? parsed.sitemapindex.sitemap
    : [parsed.sitemapindex.sitemap]

  const warnings: SitemapWarning[] = []
  const entries: SitemapIndexEntry[] = []

  for (const s of sitemaps) {
    if (typeof s.loc !== 'string' || !s.loc.trim().length) {
      warnings.push({
        type: 'validation',
        message: 'Sitemap entry missing required loc element',
      })
      continue
    }
    const loc = s.loc.trim()
    if (!isValidUrl(loc)) {
      warnings.push({
        type: 'validation',
        message: 'Sitemap entry has invalid URL',
        context: { url: loc },
      })
      continue
    }
    entries.push({
      loc,
      ...(s.lastmod && { lastmod: s.lastmod.trim() }),
    })
  }

  return { entries, warnings }
}

export function isSitemapIndex(xml: string): boolean {
  return xml.includes('<sitemapindex') || xml.includes('sitemapindex>')
}
