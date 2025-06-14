import { defu } from 'defu'
import { joinURL, withQuery } from 'ufo'
import { defineCachedFunction } from 'nitropack/runtime'
import type { NitroApp } from 'nitropack/types'
import type { H3Event } from 'h3'
import { getHeader } from 'h3'
import type {
  ModuleRuntimeConfig,
  NitroUrlResolvers,
  ResolvedSitemapUrl,
  SitemapIndexEntry, SitemapInputCtx,
  SitemapUrl,
  SitemapSourcesHookCtx,
} from '../../../types'
import { normaliseDate } from '../urlset/normalise'
import { globalSitemapSources, childSitemapSources, resolveSitemapSources } from '../urlset/sources'
import { sortInPlace } from '../urlset/sort'
import { escapeValueForXml } from './xml'
import { resolveSitemapEntries } from './sitemap'

// Create cached wrapper for sitemap index building
const buildSitemapIndexCached = defineCachedFunction(
  async (event: H3Event, resolvers: NitroUrlResolvers, runtimeConfig: ModuleRuntimeConfig, nitro?: NitroApp) => {
    return buildSitemapIndexInternal(resolvers, runtimeConfig, nitro)
  },
  {
    name: 'sitemap:index',
    group: 'sitemap',
    maxAge: 60 * 10, // 10 minutes default
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
    // enhancing
    autoLastmod,
    // chunking
    defaultSitemapsChunkSize,
    autoI18n,
    isI18nMapped,
    sortEntries,
    sitemapsPathPrefix,
  } = runtimeConfig

  if (!sitemaps)
    throw new Error('Attempting to build a sitemap index without required `sitemaps` configuration.')

  function maybeSort(urls: ResolvedSitemapUrl[]) {
    return sortEntries ? sortInPlace(urls) : urls
  }

  const chunks: Record<string | number, { urls: SitemapUrl[] }> = {}
  const allFailedSources: Array<{ url: string, error: string }> = []

  // Process all sitemaps to determine chunks
  for (const sitemapName in sitemaps) {
    if (sitemapName === 'index' || sitemapName === 'chunks') continue

    const sitemapConfig = sitemaps[sitemapName]

    // Check if this sitemap should be chunked
    if (sitemapConfig.chunks || sitemapConfig._isChunking) {
      // Mark as chunking for later processing
      sitemapConfig._isChunking = true
      sitemapConfig._chunkSize = typeof sitemapConfig.chunks === 'number'
        ? sitemapConfig.chunks
        : (sitemapConfig.chunkSize || defaultSitemapsChunkSize || 1000)
    }
    else {
      // Non-chunked sitemap
      chunks[sitemapName] = chunks[sitemapName] || { urls: [] }
    }
  }

  // Handle auto-chunking if enabled
  if (typeof sitemaps.chunks !== 'undefined') {
    const sitemap = sitemaps.chunks
    // we need to figure out how many entries we're dealing with
    let sourcesInput = await globalSitemapSources()

    // Allow hook to modify sources before resolution
    if (nitro && resolvers.event) {
      const ctx: SitemapSourcesHookCtx = {
        event: resolvers.event,
        sitemapName: sitemap.sitemapName,
        sources: sourcesInput,
      }
      await nitro.hooks.callHook('sitemap:sources', ctx)
      sourcesInput = ctx.sources
    }

    const sources = await resolveSitemapSources(sourcesInput, resolvers.event)

    // Collect failed sources
    const failedSources = sources
      .filter(source => source.error && source._isFailure)
      .map(source => ({
        url: typeof source.fetch === 'string' ? source.fetch : (source.fetch?.[0] || 'unknown'),
        error: source.error || 'Unknown error',
      }))
    allFailedSources.push(...failedSources)

    const resolvedCtx: SitemapInputCtx = {
      urls: sources.flatMap(s => s.urls),
      sitemapName: sitemap.sitemapName,
      event: resolvers.event,
    }
    await nitro?.hooks.callHook('sitemap:input', resolvedCtx)
    const normalisedUrls = resolveSitemapEntries(sitemap, resolvedCtx.urls, { autoI18n, isI18nMapped }, resolvers)
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

  const entries: SitemapIndexEntry[] = []
  // Process regular chunks
  for (const name in chunks) {
    const sitemap = chunks[name]
    const entry: SitemapIndexEntry = {
      _sitemapName: name,
      sitemap: resolvers.canonicalUrlResolver(joinURL(sitemapsPathPrefix || '', `/${name}.xml`)),
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

  // Process chunked named sitemaps
  for (const sitemapName in sitemaps) {
    if (sitemapName !== 'index' && sitemaps[sitemapName]._isChunking) {
      const sitemapConfig = sitemaps[sitemapName]
      const chunkSize = sitemapConfig._chunkSize || defaultSitemapsChunkSize || 1000

      // We need to determine how many chunks this sitemap will have
      // This requires knowing the total count of URLs, which we'll get from sources
      let sourcesInput = sitemapConfig.includeAppSources ? await globalSitemapSources() : []
      sourcesInput.push(...await childSitemapSources(sitemapConfig))

      // Allow hook to modify sources before resolution
      if (nitro && resolvers.event) {
        const ctx: SitemapSourcesHookCtx = {
          event: resolvers.event,
          sitemapName: sitemapConfig.sitemapName,
          sources: sourcesInput,
        }
        await nitro.hooks.callHook('sitemap:sources', ctx)
        sourcesInput = ctx.sources
      }

      const sources = await resolveSitemapSources(sourcesInput, resolvers.event)

      // Collect failed sources
      const failedSources = sources
        .filter(source => source.error && source._isFailure)
        .map(source => ({
          url: typeof source.fetch === 'string' ? source.fetch : (source.fetch?.[0] || 'unknown'),
          error: source.error || 'Unknown error',
        }))
      allFailedSources.push(...failedSources)

      const resolvedCtx: SitemapInputCtx = {
        urls: sources.flatMap(s => s.urls),
        sitemapName: sitemapConfig.sitemapName,
        event: resolvers.event,
      }
      await nitro?.hooks.callHook('sitemap:input', resolvedCtx)

      const normalisedUrls = resolveSitemapEntries(sitemapConfig, resolvedCtx.urls, { autoI18n, isI18nMapped }, resolvers)
      const totalUrls = normalisedUrls.length
      const chunkCount = Math.ceil(totalUrls / chunkSize)

      // Store chunk count for validation in route handler
      sitemapConfig._chunkCount = chunkCount

      // Create entries for each chunk
      for (let i = 0; i < chunkCount; i++) {
        const chunkName = `${sitemapName}-${i}`
        const entry: SitemapIndexEntry = {
          _sitemapName: chunkName,
          sitemap: resolvers.canonicalUrlResolver(joinURL(sitemapsPathPrefix || '', `/${chunkName}.xml`)),
        }

        // Get the URLs for this chunk to find lastmod
        const chunkUrls = normalisedUrls.slice(i * chunkSize, (i + 1) * chunkSize)
        let lastmod = chunkUrls
          .filter(a => !!a?.lastmod)
          .map(a => typeof a.lastmod === 'string' ? new Date(a.lastmod) : a.lastmod)
          .sort((a?: Date, b?: Date) => (b?.getTime() || 0) - (a?.getTime() || 0))?.[0]

        if (!lastmod && autoLastmod)
          lastmod = new Date()

        if (lastmod)
          entry.lastmod = normaliseDate(lastmod)

        entries.push(entry)
      }
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

export function urlsToIndexXml(sitemaps: SitemapIndexEntry[], resolvers: NitroUrlResolvers, { version, xsl, credits, minify }: Pick<ModuleRuntimeConfig, 'version' | 'xsl' | 'credits' | 'minify'>, errorInfo?: { messages: string[], urls: string[] }) {
  const sitemapXml = sitemaps.map(e => [
    '    <sitemap>',
    `        <loc>${escapeValueForXml(e.sitemap)}</loc>`,
    // lastmod is optional
    e.lastmod ? `        <lastmod>${escapeValueForXml(e.lastmod)}</lastmod>` : false,
    '    </sitemap>',
  ].filter(Boolean).join('\n')).join('\n')

  const xmlParts = [
    '<?xml version="1.0" encoding="UTF-8"?>',
  ]

  // Add XSL if enabled
  if (xsl) {
    let relativeBaseUrl = resolvers.relativeBaseUrlResolver?.(xsl) ?? xsl

    // Add error information to XSL URL if available
    if (errorInfo && errorInfo.messages.length > 0) {
      relativeBaseUrl = withQuery(relativeBaseUrl, {
        errors: 'true',
        error_messages: errorInfo.messages,
        error_urls: errorInfo.urls,
      })
    }

    xmlParts.push(`<?xml-stylesheet type="text/xsl" href="${escapeValueForXml(relativeBaseUrl)}"?>`)
  }

  // Add sitemap index content
  xmlParts.push(
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    sitemapXml,
    '</sitemapindex>',
  )

  // Add credits if enabled
  if (credits) {
    xmlParts.push(`<!-- XML Sitemap Index generated by @nuxtjs/sitemap v${version} at ${new Date().toISOString()} -->`)
  }

  // Join with appropriate separator
  return minify
    ? xmlParts.join('').replace(/(?<!<[^>]*)\s(?![^<]*>)/g, '')
    : xmlParts.join('\n')
}

export async function buildSitemapIndex(resolvers: NitroUrlResolvers, runtimeConfig: ModuleRuntimeConfig, nitro?: NitroApp) {
  // Check if should use cached version
  if (!import.meta.dev && typeof runtimeConfig.cacheMaxAgeSeconds === 'number' && runtimeConfig.cacheMaxAgeSeconds > 0 && resolvers.event) {
    return buildSitemapIndexCached(resolvers.event, resolvers, runtimeConfig, nitro)
  }
  return buildSitemapIndexInternal(resolvers, runtimeConfig, nitro)
}
