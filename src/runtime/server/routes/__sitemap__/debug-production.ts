import type { SitemapWarning } from '@nuxtjs/sitemap/utils'
import { isSitemapIndex, parseSitemapIndex, parseSitemapXml } from '@nuxtjs/sitemap/utils'
import { defineEventHandler, getQuery } from 'h3'

export interface ProductionSitemapEntry {
  loc: string
  urlCount: number
  warnings: SitemapWarning[]
  error?: string
  lastmod?: string
}

export interface ProductionDebugResponse {
  url: string
  isIndex: boolean
  sitemaps: ProductionSitemapEntry[]
  warnings: SitemapWarning[]
  error?: string
}

async function fetchXml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { Accept: 'application/xml, text/xml' },
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok)
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  return response.text()
}

export default defineEventHandler(async (e): Promise<ProductionDebugResponse | Record<string, any>> => {
  const { url, mode } = getQuery(e) as { url?: string, mode?: string }
  if (!url || typeof url !== 'string')
    return { url: '', isIndex: false, sitemaps: [], warnings: [], error: 'Missing url query parameter' }

  // Try fetching the production debug.json endpoint (requires debug: true in production config)
  if (mode === 'debug') {
    const debugUrl = `${url.replace(/\/$/, '')}/__sitemap__/debug.json`
    const response = await fetch(debugUrl, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    }).catch(() => null)
    if (response?.ok) {
      const json = await response.json().catch(() => null)
      if (json?.sitemaps)
        return json
    }
    // Fall through to XML-based approach
  }

  // Determine the sitemap URL to fetch
  const sitemapUrl = url.endsWith('/') ? `${url}sitemap.xml` : url

  const xml = await fetchXml(sitemapUrl).catch((err: Error) => {
    return err
  })

  if (xml instanceof Error)
    return { url: sitemapUrl, isIndex: false, sitemaps: [], warnings: [], error: `Failed to fetch sitemap: ${xml.message}` }

  if (isSitemapIndex(xml)) {
    const { entries, warnings } = parseSitemapIndex(xml)
    const sitemaps: ProductionSitemapEntry[] = await Promise.all(
      entries.map(async (entry) => {
        const childXml = await fetchXml(entry.loc).catch((err: Error) => err)
        if (childXml instanceof Error) {
          return {
            loc: entry.loc,
            urlCount: 0,
            warnings: [],
            error: childXml.message,
            lastmod: entry.lastmod,
          }
        }
        const result = await parseSitemapXml(childXml).catch((err: Error) => ({
          urls: [],
          warnings: [{ type: 'validation' as const, message: err.message }],
        }))
        return {
          loc: entry.loc,
          urlCount: result.urls.length,
          warnings: result.warnings,
          lastmod: entry.lastmod,
        }
      }),
    )
    return { url: sitemapUrl, isIndex: true, sitemaps, warnings }
  }

  // Single sitemap
  const result = await parseSitemapXml(xml).catch((err: Error) => ({
    urls: [],
    warnings: [{ type: 'validation' as const, message: err.message }],
  }))
  return {
    url: sitemapUrl,
    isIndex: false,
    sitemaps: [{
      loc: sitemapUrl,
      urlCount: result.urls.length,
      warnings: result.warnings,
    }],
    warnings: [],
  }
})
