import type { RequestEvent } from 'nuxt/server'
import type {
  ModuleRuntimeConfig,
  NitroUrlResolvers,
  ResolvedSitemapUrl,
  SitemapDefinition,
  SitemapItemDefaults,
  SitemapOutputHookCtx,
  SitemapRenderCtx,
} from '../../types'
import { defu } from 'defu'
import { fixSlashes } from 'nuxt-site-config/urls'
import { createError, getRequestHeader as getHeader, getQuery, useRuntimeConfig } from 'nuxt/server'
import { createNitroRouteRuleMatcher } from 'nuxtseo-shared/server'
import { defineCachedFunction, useNitroApp } from '#nuxtseo/nitro'
import { getPathRobotConfig } from '#robots/server'
import { createSitePathResolver, getSiteConfig } from '#site-config/server'
// @ts-expect-error virtual module
import staticConfig from '#sitemap-virtual/static-config.mjs'
import { logger, mergeOnKey, robotsBlocksIndexing, splitForLocales } from '../../utils-pure'
import { buildSitemapUrls, urlsToXml, urlsToXmlStream } from './builder/sitemap'
import { compressSitemapOutput } from './compression'
import { createChunkedXmlStream } from './stream'
import { normaliseEntry, preNormalizeEntry } from './urlset/normalise'
import { sortInPlace } from './urlset/sort'

type NitroApp = ReturnType<typeof useNitroApp>

// Read at module init: defineCachedFunction takes a static maxAge. Falls back to 10 minutes
// when caching is disabled in static config (still bypassed at request time via shouldCache).
const SERVER_CACHE_MAX_AGE = (staticConfig.cacheMaxAgeSeconds as number | false) || 60 * 10

interface SitemapNitroApp extends NitroApp {
  _sitemapWarned?: boolean
}

interface SitemapRouteRules {
  headers?: Record<string, string>
  redirect?: unknown
  robots?: unknown
  sitemap?: SitemapItemDefaults | false
}

export function useNitroUrlResolvers(e: RequestEvent): NitroUrlResolvers {
  const canonicalQuery = getQuery(e).canonical
  const isShowingCanonical = typeof canonicalQuery !== 'undefined' && canonicalQuery !== 'false'
  const siteConfig = getSiteConfig(e)
  return {
    event: e,
    fixSlashes: (path: string) => fixSlashes(siteConfig.trailingSlash, path),
    // we need these as they depend on the nitro event
    canonicalUrlResolver: createSitePathResolver(e, {
      canonical: isShowingCanonical || !import.meta.dev,
      absolute: true,
      withBase: true,
    }),
    relativeBaseUrlResolver: createSitePathResolver(e, { absolute: false, withBase: true }),
  }
}

// Shared sitemap resolution and normalization. This work must finish before response
// streaming begins because hooks, filtering, deduplication, and sorting can affect any URL.
async function buildSitemapRenderPlan(event: RequestEvent, definition: SitemapDefinition, resolvers: NitroUrlResolvers, runtimeConfig: ModuleRuntimeConfig) {
  const { sitemapName } = definition
  const nitro = useNitroApp() as SitemapNitroApp
  if (import.meta.prerender) {
    const config = getSiteConfig(event)
    if (!config.url && !nitro._sitemapWarned) {
      nitro._sitemapWarned = true
      logger.error('Sitemap Site URL missing!')
      logger.info('To fix this please add `{ site: { url: \'site.com\' } }` to your Nuxt config or a `NUXT_PUBLIC_SITE_URL=site.com` to your .env. Learn more at https://nuxtseo.com/site-config/getting-started/how-it-works')
      throw createError({
        statusText: 'You must provide a site URL to prerender a sitemap.',
        status: 500,
      })
    }
  }
  const { urls: resolvedSitemapUrls, failedSources } = await buildSitemapUrls(definition, resolvers, runtimeConfig, nitro)
  // URL resolution is cached separately and may hand concurrent requests the same
  // array. Keep compaction and hooks local to this render plan.
  const sitemapUrls = resolvedSitemapUrls.slice()

  if (import.meta.prerender && failedSources.length) {
    throw createError({
      status: 500,
      message: `Sitemap generation failed due to ${failedSources.length} failed sources: ${failedSources.map(s => `"${s.url}" (${s.error})`).join(', ')}`,
    })
  }

  const routeRuleMatcher = createNitroRouteRuleMatcher<SitemapRouteRules>(useRuntimeConfig())
  const headerRuleMatcher = createNitroRouteRuleMatcher<SitemapRouteRules>({
    app: useRuntimeConfig().app,
    nitro: { routeRules: runtimeConfig.routeRuleHeaders || {} },
  })
  const { autoI18n } = runtimeConfig
  const localeCodes = autoI18n?.locales && autoI18n.strategy !== 'no_prefix'
    ? new Set(autoI18n.locales.map(l => l.code))
    : undefined

  // Process in place to avoid creating intermediate arrays
  const sourceCount = sitemapUrls.length
  let validCount = 0
  for (let i = 0; i < sitemapUrls.length; i++) {
    const u = sitemapUrls[i]!
    const path = u._path?.pathname || u.loc

    // Early continue for robots blocked paths
    if (!getPathRobotConfig(event, { path, skipSiteIndexable: true }).indexable)
      continue

    let routeRules = routeRuleMatcher(path)
    let headerRules = headerRuleMatcher(path)

    // Apply top-level path without prefix
    if (localeCodes) {
      const match = splitForLocales(path, localeCodes)
      const pathWithoutPrefix = match[1]
      if (pathWithoutPrefix && pathWithoutPrefix !== path)
        routeRules = defu(routeRules, routeRuleMatcher(pathWithoutPrefix))
      if (pathWithoutPrefix && pathWithoutPrefix !== path)
        headerRules = defu(headerRules, headerRuleMatcher(pathWithoutPrefix))
    }

    // Skip invalid entries
    if (routeRules.sitemap === false)
      continue
    if (robotsBlocksIndexing(routeRules.robots))
      continue

    let hasRobotsDisabled = false
    const headers = headerRules.headers
    if (headers) {
      for (const name in headers) {
        if (name.toLowerCase() === 'x-robots-tag' && headers[name]!.toLowerCase().includes('noindex')) {
          hasRobotsDisabled = true
          break
        }
      }
    }

    if (routeRules.redirect || hasRobotsDisabled)
      continue

    // Move valid entries to the front of the array
    sitemapUrls[validCount++] = (routeRules.sitemap ? defu(u, routeRules.sitemap) : u) as ResolvedSitemapUrl
  }

  // Truncate array to valid entries only
  sitemapUrls.length = validCount
  if (import.meta.dev && validCount === 0 && sourceCount > 0) {
    logger.warn(`Sitemap had ${sourceCount} URLs that were all filtered out. This may be due to a robots rules blocking these URLs from indexing. Check your /** route rules or robots.txt configuration.`)
  }

  // 6. nitro hooks
  const locSize = sitemapUrls.length
  const resolvedCtx: SitemapRenderCtx = {
    urls: sitemapUrls,
    sitemapName,
    event,
  }
  await nitro.hooks.callHook('sitemap:resolved', resolvedCtx)
  // we need to normalize any new urls otherwise they won't appear in the final sitemap
  // Note this is risky and users should be using the sitemap:input hook for additions
  if (resolvedCtx.urls.length !== locSize) {
    for (let i = 0; i < resolvedCtx.urls.length; i++)
      resolvedCtx.urls[i] = preNormalizeEntry(resolvedCtx.urls[i]!, resolvers)
  }

  const maybeSort = (urls: ResolvedSitemapUrl[]) => runtimeConfig.sortEntries ? sortInPlace(urls) : urls
  // final urls
  const defaults = definition.defaults
  const normalizedPreDedupe = resolvedCtx.urls
  // Repeated CMS/default timestamps are common and expensive to parse. Sample the leading entries
  // so unique timestamp feeds avoid paying cache bookkeeping on every URL.
  const firstLastmod = normalizedPreDedupe[0]?.lastmod ?? defaults?.lastmod
  let cacheLastmod = normalizedPreDedupe.length > 1 && !!firstLastmod
  for (let i = 1; cacheLastmod && i < Math.min(normalizedPreDedupe.length, 8); i++)
    cacheLastmod = (normalizedPreDedupe[i]!.lastmod ?? defaults?.lastmod) === firstLastmod
  const normaliseCache = cacheLastmod ? {} : undefined
  for (let i = 0; i < normalizedPreDedupe.length; i++)
    normalizedPreDedupe[i] = normaliseEntry(normalizedPreDedupe[i]!, defaults, resolvers, normaliseCache)
  const duplicateKeys = new Set<string>()
  const urls = mergeOnKey(normalizedPreDedupe, '_key', key => duplicateKeys.add(key))
  // A merge can introduce duplicate alternatives/images/videos. Unique URLs are already fully
  // normalized, so avoid cloning and resolving every nested entry a second time.
  if (duplicateKeys.size) {
    for (let i = 0; i < urls.length; i++) {
      if (duplicateKeys.has(urls[i]!._key))
        urls[i] = normaliseEntry(urls[i]!, defaults, resolvers, normaliseCache)
    }
  }
  maybeSort(urls)

  // Check if this is a chunk request that would be empty
  if (definition._isChunking && definition.sitemapName.includes('-')) {
    const parts = definition.sitemapName.split('-')
    const lastPart = parts.pop()
    if (!Number.isNaN(Number(lastPart))) {
      const chunkIndex = Number(lastPart)
      const baseSitemapName = parts.join('-')
      // If this is a chunk and we have no URLs, it means the chunk doesn't exist
      if (urls.length === 0 && chunkIndex > 0) {
        throw createError({
          status: 404,
          message: `Sitemap chunk ${chunkIndex} for "${baseSitemapName}" does not exist.`,
        })
      }
    }
  }

  // Prepare error information for XSL if there are failed sources
  const errorInfo = failedSources.length > 0
    ? {
        messages: failedSources.map(f => f.error),
        urls: failedSources.map(f => f.url),
      }
    : undefined
  return { errorInfo, sitemapName, urls }
}

export async function renderSitemapOutput(
  nitro: NitroApp,
  event: RequestEvent,
  sitemapName: string,
  renderString: () => string,
  renderStream: () => ReadableStream<Uint8Array>,
  shouldStream: boolean,
  debug: boolean,
): Promise<string | ReadableStream<Uint8Array>> {
  if (!shouldStream) {
    const ctx: SitemapOutputHookCtx = { sitemap: renderString(), sitemapName, event }
    await nitro.hooks.callHook('sitemap:output', ctx)
    return ctx.sitemap
  }

  let buffered = false
  let sitemap: string | undefined
  const ctx = { sitemapName, event } as SitemapOutputHookCtx
  Object.defineProperty(ctx, 'sitemap', {
    configurable: true,
    enumerable: true,
    get() {
      buffered = true
      sitemap ??= renderString()
      return sitemap
    },
    set(value: string) {
      buffered = true
      sitemap = value
    },
  })

  await nitro.hooks.callHook('sitemap:output', ctx)

  if (debug)
    event.res.headers.set('X-Sitemap-Render-Mode', buffered ? 'buffered-hook' : 'stream')

  return buffered
    ? createChunkedXmlStream([sitemap!])
    : renderStream()
}

// Shared buffered sitemap building logic used by the legacy response and full XML cache.
async function buildSitemapXml(event: RequestEvent, definition: SitemapDefinition, resolvers: NitroUrlResolvers, runtimeConfig: ModuleRuntimeConfig) {
  const { errorInfo, sitemapName, urls } = await buildSitemapRenderPlan(event, definition, resolvers, runtimeConfig)
  const sitemap = urlsToXml(urls, resolvers, runtimeConfig, errorInfo)

  const ctx = { sitemap, sitemapName, event }
  await useNitroApp().hooks.callHook('sitemap:output', ctx)
  return ctx.sitemap
}

function getSitemapCacheKey(event: RequestEvent, definition: SitemapDefinition) {
  // Include headers that can affect absolute URL generation in the cache key.
  const host = getHeader(event, 'x-forwarded-host') || getHeader(event, 'host') || ''
  const proto = getHeader(event, 'x-forwarded-proto') || 'https'
  const sitemapName = definition.sitemapName || 'default'
  return `${sitemapName}-${proto}-${host}`
}

// Streaming responses cannot cache a serialized XML string without restoring the
// full-response allocation. Cache the finalized URL plan instead, then serialize
// and optionally compress it as a pull-driven stream for each response.
const buildSitemapRenderPlanCached = defineCachedFunction(
  buildSitemapRenderPlan,
  {
    name: 'sitemap:render-plan',
    group: 'sitemap',
    maxAge: SERVER_CACHE_MAX_AGE,
    base: 'sitemap',
    getKey: getSitemapCacheKey,
    swr: true,
  },
)

// Create cached function for building sitemap XML
const buildSitemapXmlCached = defineCachedFunction(
  buildSitemapXml,
  {
    name: 'sitemap:xml',
    group: 'sitemap',
    maxAge: SERVER_CACHE_MAX_AGE,
    base: 'sitemap', // Use the sitemap storage
    getKey: getSitemapCacheKey,
    swr: true, // Enable stale-while-revalidate
  },
)

export function setSitemapResponseHeaders(event: RequestEvent, runtimeConfig: ModuleRuntimeConfig) {
  event.res.headers.set('Content-Type', 'text/xml; charset=UTF-8')
  if (runtimeConfig.cacheMaxAgeSeconds) {
    event.res.headers.set('Cache-Control', `public, max-age=${runtimeConfig.cacheMaxAgeSeconds}, s-maxage=${runtimeConfig.cacheMaxAgeSeconds}, stale-while-revalidate=3600`)
    const now = new Date()
    event.res.headers.set('X-Sitemap-Generated', now.toISOString())
    event.res.headers.set('X-Sitemap-Cache-Duration', `${runtimeConfig.cacheMaxAgeSeconds}s`)
    const expiryTime = new Date(now.getTime() + (runtimeConfig.cacheMaxAgeSeconds * 1000))
    event.res.headers.set('X-Sitemap-Cache-Expires', expiryTime.toISOString())
    const remainingSeconds = Math.floor((expiryTime.getTime() - now.getTime()) / 1000)
    event.res.headers.set('X-Sitemap-Cache-Remaining', `${remainingSeconds}s`)
  }
  else {
    event.res.headers.set('Cache-Control', `no-cache, no-store`)
  }
  event.context._isSitemap = true
}

export async function createSitemap(event: RequestEvent, definition: SitemapDefinition, runtimeConfig: ModuleRuntimeConfig) {
  const resolvers = useNitroUrlResolvers(event)
  const shouldStream = !!runtimeConfig.experimentalStreaming && !import.meta.prerender

  // Choose between cached or direct generation.
  // Skip caching during prerender so the final filesystem source handoff can replace
  // the initial build-time sources after the crawl.
  // A serialized XML cache necessarily buffers the entire response. Streaming mode caches
  // the finalized render plan instead and serializes those resolved URLs on demand.
  const shouldCache = !import.meta.dev && !import.meta.prerender && typeof runtimeConfig.cacheMaxAgeSeconds === 'number' && runtimeConfig.cacheMaxAgeSeconds > 0
  let xml: string | ReadableStream<Uint8Array>
  if (shouldStream) {
    const { errorInfo, sitemapName, urls } = shouldCache
      ? await buildSitemapRenderPlanCached(event, definition, resolvers, runtimeConfig)
      : await buildSitemapRenderPlan(event, definition, resolvers, runtimeConfig)
    xml = await renderSitemapOutput(
      useNitroApp(),
      event,
      sitemapName,
      () => urlsToXml(urls, resolvers, runtimeConfig, errorInfo),
      () => urlsToXmlStream(urls, resolvers, runtimeConfig, errorInfo),
      true,
      runtimeConfig.debug,
    )
  }
  else {
    xml = shouldCache
      ? await buildSitemapXmlCached(event, definition, resolvers, runtimeConfig)
      : await buildSitemapXml(event, definition, resolvers, runtimeConfig)
  }

  setSitemapResponseHeaders(event, runtimeConfig)
  return compressSitemapOutput(event, xml, !!runtimeConfig.experimentalCompression)
}
