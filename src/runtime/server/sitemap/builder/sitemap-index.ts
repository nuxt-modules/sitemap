import type { H3Event } from 'h3'
import type { NitroApp } from 'nitropack/types'
import type {
  ModuleRuntimeConfig,
  NitroUrlResolvers,
  SitemapIndexEntry,
} from '../../../types'
import { getHeader } from 'h3'
import { defineCachedFunction } from 'nitropack/runtime'
import { joinURL } from 'ufo'
// @ts-expect-error virtual module
import staticConfig from '#sitemap-virtual/static-config.mjs'
import { normaliseDate } from '../urlset/normalise'
import { getResolvedSitemapUrls } from './sitemap'

const SERVER_CACHE_MAX_AGE = (staticConfig.cacheMaxAgeSeconds as number | false) || 60 * 10

// Create cached wrapper for sitemap index building
const buildSitemapIndexCached = defineCachedFunction(
  async (event: H3Event, resolvers: NitroUrlResolvers, runtimeConfig: ModuleRuntimeConfig, nitro?: NitroApp) => {
    return buildSitemapIndexInternal(resolvers, runtimeConfig, nitro)
  },
  {
    name: 'sitemap:index',
    group: 'sitemap',
    maxAge: SERVER_CACHE_MAX_AGE,
    base: 'sitemap', // Use the sitemap storage
    getKey: (event: H3Event) => {
      // Include headers that could affect the output in the cache key
      const host = getHeader(event, 'host') || getHeader(event, 'x-forwarded-host') || ''
      const proto = getHeader(event, 'x-forwarded-proto') || 'https'
      return `sitemap-index-${proto}-${host}`
    },
    swr: true, // Enable stale-while-revalidate
  },
)

async function buildSitemapIndexInternal(resolvers: NitroUrlResolvers, runtimeConfig: ModuleRuntimeConfig, nitro?: NitroApp): Promise<{ entries: SitemapIndexEntry[], failedSources: Array<{ url: string, error: string }> }> {
  const {
    sitemaps,
    autoLastmod,
    defaultSitemapsChunkSize,
    sitemapsPathPrefix,
  } = runtimeConfig

  if (!sitemaps)
    throw new Error('Attempting to build a sitemap index without required `sitemaps` configuration.')

  const nonChunkedNames: string[] = []
  const allFailedSources: Array<{ url: string, error: string }> = []

  // Process all sitemaps to determine chunks
  for (const sitemapName in sitemaps) {
    if (sitemapName === 'index' || sitemapName === 'chunks')
      continue

    const sitemapConfig = sitemaps[sitemapName]!

    // Check if this sitemap should be chunked
    if (sitemapConfig.chunks || sitemapConfig._isChunking) {
      // Mark as chunking for later processing
      sitemapConfig._isChunking = true
      sitemapConfig._chunkSize = sitemapConfig.chunkSize || (typeof sitemapConfig.chunks === 'number' ? sitemapConfig.chunks : (defaultSitemapsChunkSize || 1000))
    }
    else {
      nonChunkedNames.push(sitemapName)
    }
  }

  // sitemap.org defines index <lastmod> as the file's modification time, not the max of URL
  // lastmods inside it. Our default sort is by `loc`, so per-chunk URL lastmods were already
  // misleading. Emit `new Date()` when autoLastmod is on, otherwise no <lastmod>. This avoids
  // a slice/filter/sort pass per chunk and lets us count without holding URLs in memory.
  const indexLastmod = autoLastmod ? normaliseDate(new Date()) : undefined
  const entries: SitemapIndexEntry[] = []
  const pushEntry = (name: string) => {
    const entry: SitemapIndexEntry = {
      _sitemapName: name,
      sitemap: resolvers.canonicalUrlResolver(joinURL(sitemapsPathPrefix || '', `/${name}.xml`)),
    }
    if (indexLastmod)
      entry.lastmod = indexLastmod
    entries.push(entry)
  }

  // Auto-chunking: count URLs to know how many chunk entries to emit. Shares cache with the
  // chunk handler (matchName 'sitemap', isChunked true) so the source fetch is one-shot.
  if (typeof sitemaps.chunks !== 'undefined') {
    const sitemap = sitemaps.chunks
    const resolved = await getResolvedSitemapUrls(sitemap, 'sitemap', true, resolvers, runtimeConfig, nitro)
    allFailedSources.push(...resolved.failedSources)
    const chunkCount = Math.ceil(resolved.urls.length / (defaultSitemapsChunkSize as number))
    for (let i = 0; i < chunkCount; i++)
      pushEntry(String(i))
  }

  // Non-chunked named sitemaps: just emit one entry each, no fetch.
  for (const name of nonChunkedNames)
    pushEntry(name)

  // Chunked named sitemaps. Skip the source fetch when `chunkCount` is declared upfront.
  for (const sitemapName in sitemaps) {
    const sitemapConfig = sitemaps[sitemapName]!
    if (sitemapName !== 'index' && sitemapConfig._isChunking) {
      const chunkSize = sitemapConfig._chunkSize || defaultSitemapsChunkSize || 1000

      let chunkCount: number
      if (typeof sitemapConfig.chunkCount === 'number' && sitemapConfig.chunkCount > 0) {
        chunkCount = sitemapConfig.chunkCount
      }
      else {
        const resolved = await getResolvedSitemapUrls(sitemapConfig, sitemapName, true, resolvers, runtimeConfig, nitro)
        allFailedSources.push(...resolved.failedSources)
        chunkCount = Math.ceil(resolved.urls.length / chunkSize)
      }

      sitemapConfig._chunkCount = chunkCount

      for (let i = 0; i < chunkCount; i++)
        pushEntry(`${sitemapName}-${i}`)
    }
  }

  // allow extending the index sitemap
  if (sitemaps.index) {
    entries.push(...sitemaps.index.sitemaps.map((entry) => {
      return typeof entry === 'string' ? { sitemap: entry } : entry
    }))
  }

  return { entries, failedSources: allFailedSources }
}

export async function buildSitemapIndex(resolvers: NitroUrlResolvers, runtimeConfig: ModuleRuntimeConfig, nitro?: NitroApp) {
  // Check if should use cached version.
  // Skip caching during prerender: sources are written to disk by `prerender:done`, so
  // an early crawl would otherwise poison the cache with an empty result.
  if (!import.meta.dev && !import.meta.prerender && typeof runtimeConfig.cacheMaxAgeSeconds === 'number' && runtimeConfig.cacheMaxAgeSeconds > 0 && resolvers.event) {
    return buildSitemapIndexCached(resolvers.event, resolvers, runtimeConfig, nitro)
  }
  return buildSitemapIndexInternal(resolvers, runtimeConfig, nitro)
}

export { urlsToIndexXml, urlsToIndexXmlStream } from './index-xml'
