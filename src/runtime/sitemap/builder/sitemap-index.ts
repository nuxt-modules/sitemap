import { defu } from 'defu'
import { appendHeader } from 'h3'
import type {
  ModuleRuntimeConfig,
  NitroUrlResolvers,
  ResolvedSitemapUrl,
  SitemapIndexEntry,
  SitemapUrl,
} from '../../types'
import { normaliseDate, normaliseSitemapUrls } from '../urlset/normalise'
import { globalSitemapSources, resolveSitemapSources } from '../urlset/sources'
import { applyI18nEnhancements } from '../urlset/i18n'
import { filterSitemapUrls } from '../urlset/filter'
import { sortSitemapUrls } from '../urlset/sort'
import { escapeValueForXml, wrapSitemapXml } from './xml'
import { useRuntimeConfig } from '#imports'

export async function buildSitemapIndex(resolvers: NitroUrlResolvers) {
  const {
    sitemaps,
    // enhancing
    autoLastmod,
    // chunking
    defaultSitemapsChunkSize,
    autoI18n,
    sortEntries,
    // xls
    version,
    xsl,
    credits,
  } = useRuntimeConfig()['nuxt-simple-sitemap'] as any as ModuleRuntimeConfig

  if (!sitemaps)
    throw new Error('Attempting to build a sitemap index without required `sitemaps` configuration.')

  function maybeSort(urls: ResolvedSitemapUrl[]) {
    return sortEntries ? sortSitemapUrls(urls) : urls
  }

  const isChunking = typeof sitemaps.chunks !== 'undefined'
  const chunks: Record<string | number, { urls: SitemapUrl[] }> = {}
  if (isChunking) {
    const sitemap = sitemaps.chunks
    // TODO
    // we need to figure out how many entries we're dealing with
    const sources = await resolveSitemapSources(await globalSitemapSources())
    // we need to generate multiple sitemaps with dynamically generated names
    const normalisedUrls = normaliseSitemapUrls(sources.map(e => e.urls).flat(), resolvers)
    // 2. enhance
    let enhancedUrls: ResolvedSitemapUrl[] = normalisedUrls
      .map(e => defu(e, sitemap.defaults) as ResolvedSitemapUrl)
    // TODO enable
    if (autoI18n?.locales)
      enhancedUrls = applyI18nEnhancements(enhancedUrls, { autoI18n, sitemapName: sitemap.sitemapName })
    // 3. filtered urls
    // TODO make sure include and exclude start with baseURL?
    const filteredUrls = filterSitemapUrls(enhancedUrls, sitemap)
    // 4. sort
    const sortedUrls = maybeSort(filteredUrls)
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

  // tell the prerender to render the other sitemaps (if we prerender this one)
  // this solves the dynamic chunking sitemap issue
  if (import.meta.prerender) {
    appendHeader(
      resolvers.event,
      'x-nitro-prerender',
      Object.keys(chunks).map(name => encodeURIComponent(`/${name}-sitemap.xml`)).join(', '),
    )
  }

  const entries: SitemapIndexEntry[] = []
  // normalise
  for (const name in chunks) {
    const sitemap = chunks[name]
    const entry: SitemapIndexEntry = {
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
  if (sitemaps.index)
    entries.push(...sitemaps.index.sitemaps.map(s => ({ sitemap: s })))

  const sitemapXml = entries.map(e => [
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
