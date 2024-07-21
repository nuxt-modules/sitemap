import { defu } from 'defu'
import type {
  ModuleRuntimeConfig,
  NitroUrlResolvers,
  ResolvedSitemapUrl,
  SitemapIndexEntry,
  SitemapUrl,
} from '../../../types'
import { normaliseDate } from '../urlset/normalise'
import { globalSitemapSources, resolveSitemapSources } from '../urlset/sources'
import { sortSitemapUrls } from '../urlset/sort'
import { escapeValueForXml, wrapSitemapXml } from './xml'
import { resolveSitemapEntries } from './sitemap'

export async function buildSitemapIndex(resolvers: NitroUrlResolvers, runtimeConfig: ModuleRuntimeConfig) {
  const {
    sitemaps,
    // enhancing
    autoLastmod,
    // chunking
    defaultSitemapsChunkSize,
    autoI18n,
    isI18nMapped,
    sortEntries,
  } = runtimeConfig

  if (!sitemaps)
    throw new Error('Attempting to build a sitemap index without required `sitemaps` configuration.')

  function maybeSort(urls: ResolvedSitemapUrl[]) {
    return sortEntries ? sortSitemapUrls(urls) : urls
  }

  const isChunking = typeof sitemaps.chunks !== 'undefined'
  const chunks: Record<string | number, { urls: SitemapUrl[] }> = {}
  if (isChunking) {
    const sitemap = sitemaps.chunks
    // we need to figure out how many entries we're dealing with
    const sources = await resolveSitemapSources(await globalSitemapSources())
    const normalisedUrls = resolveSitemapEntries(sitemap, sources, { autoI18n, isI18nMapped })
    // 2. enhance
    const enhancedUrls: ResolvedSitemapUrl[] = normalisedUrls
      .map(e => defu(e, sitemap.defaults) as ResolvedSitemapUrl)
    const sortedUrls = maybeSort(enhancedUrls)
    // split into the max size which should be 1000
    sortedUrls.forEach((url, i) => {
      const chunkIndex = Math.floor(i / (defaultSitemapsChunkSize as number))
      chunks[chunkIndex] = chunks[chunkIndex] || { urls: [] }
      chunks[chunkIndex].urls.push(url)
    })
  }
  else {
    for (const sitemap in sitemaps) {
      if (sitemap !== 'index') {
        // user provided sitemap config
        chunks[sitemap] = chunks[sitemap] || { urls: [] }
      }
    }
  }

  const entries: SitemapIndexEntry[] = []
  // normalise
  for (const name in chunks) {
    const sitemap = chunks[name]
    const entry: SitemapIndexEntry = {
      _sitemapName: name,
      sitemap: resolvers.canonicalUrlResolver(`${name}-sitemap.xml`),
    }
    let lastmod = sitemap.urls
      .filter(a => !!a?.lastmod)
      .map(a => typeof a.lastmod === 'string' ? new Date(a.lastmod) : a.lastmod)
      .sort((a?: Date, b?: Date) => (b?.getTime() || 0) - (a?.getTime() || 0))?.[0]
    if (!lastmod && autoLastmod)
      lastmod = new Date()

    if (lastmod)
      entry.lastmod = normaliseDate(lastmod)
    entries.push(entry)
  }

  // allow extending the index sitemap
  if (sitemaps.index) {
    entries.push(...sitemaps.index.sitemaps.map((entry) => {
      return typeof entry === 'string' ? { sitemap: entry } : entry
    }))
  }

  return entries
}

export function urlsToIndexXml(sitemaps: SitemapIndexEntry[], resolvers: NitroUrlResolvers, { version, xsl, credits }: Pick<ModuleRuntimeConfig, 'version' | 'xsl' | 'credits'>) {
  const sitemapXml = sitemaps.map(e => [
    '    <sitemap>',
    `        <loc>${escapeValueForXml(e.sitemap)}</loc>`,
    // lastmod is optional
    e.lastmod ? `        <lastmod>${escapeValueForXml(e.lastmod)}</lastmod>` : false,
    '    </sitemap>',
  ].filter(Boolean).join('\n')).join('\n')

  return wrapSitemapXml([
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    sitemapXml,
    '</sitemapindex>',
  ], resolvers, { version, xsl, credits })
}
