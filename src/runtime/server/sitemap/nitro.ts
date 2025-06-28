import { getQuery, setHeader, createError, getHeader } from 'h3'
import type { H3Event } from 'h3'
import { fixSlashes } from 'nuxt-site-config/urls'
import { defu } from 'defu'
import { useNitroApp, defineCachedFunction } from 'nitropack/runtime'
import type {
  ModuleRuntimeConfig,
  NitroUrlResolvers,
  ResolvedSitemapUrl,
  SitemapDefinition,
  SitemapRenderCtx,
} from '../../types'
import { logger, mergeOnKey, splitForLocales } from '../../utils-pure'
import { createNitroRouteRuleMatcher } from '../kit'
import { buildSitemapUrls, urlsToXml } from './builder/sitemap'
import { normaliseEntry, preNormalizeEntry } from './urlset/normalise'
import { sortInPlace } from './urlset/sort'
// @ts-expect-error virtual
import { getPathRobotConfig } from '#internal/nuxt-robots/getPathRobotConfig' // can't solve this
import { useSiteConfig } from '#site-config/server/composables/useSiteConfig'
import { createSitePathResolver } from '#site-config/server/composables/utils'

export function useNitroUrlResolvers(e: H3Event): NitroUrlResolvers {
  const canonicalQuery = getQuery(e).canonical
  const isShowingCanonical = typeof canonicalQuery !== 'undefined' && canonicalQuery !== 'false'
  const siteConfig = useSiteConfig(e)
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

// Shared sitemap building logic
async function buildSitemapXml(event: H3Event, definition: SitemapDefinition, resolvers: NitroUrlResolvers, runtimeConfig: ModuleRuntimeConfig) {
  const { sitemapName } = definition
  const nitro = useNitroApp()
  if (import.meta.prerender) {
    const config = useSiteConfig(event)
    if (!config.url && !nitro._sitemapWarned) {
      nitro._sitemapWarned = true
      logger.error('Sitemap Site URL missing!')
      logger.info('To fix this please add `{ site: { url: \'site.com\' } }` to your Nuxt config or a `NUXT_PUBLIC_SITE_URL=site.com` to your .env. Learn more at https://nuxtseo.com/site-config/getting-started/how-it-works')
      throw new createError({
        statusMessage: 'You must provide a site URL to prerender a sitemap.',
        statusCode: 500,
      })
    }
  }
  const { urls: sitemapUrls, failedSources } = await buildSitemapUrls(definition, resolvers, runtimeConfig, nitro)

  const routeRuleMatcher = createNitroRouteRuleMatcher()
  const { autoI18n } = runtimeConfig

  // Process in place to avoid creating intermediate arrays
  let validCount = 0
  for (let i = 0; i < sitemapUrls.length; i++) {
    const u = sitemapUrls[i]
    const path = u._path?.pathname || u.loc

    // Early continue for robots blocked paths
    if (!getPathRobotConfig(event, { path, skipSiteIndexable: true }).indexable)
      continue

    let routeRules = routeRuleMatcher(path)

    // Apply top-level path without prefix
    if (autoI18n?.locales && autoI18n?.strategy !== 'no_prefix') {
      const match = splitForLocales(path, autoI18n.locales.map(l => l.code))
      const pathWithoutPrefix = match[1]
      if (pathWithoutPrefix && pathWithoutPrefix !== path)
        routeRules = defu(routeRules, routeRuleMatcher(pathWithoutPrefix))
    }

    // Skip invalid entries
    if (routeRules.sitemap === false)
      continue
    // @ts-expect-error runtime types
    if (typeof routeRules.robots !== 'undefined' && !routeRules.robots)
      continue

    const hasRobotsDisabled = Object.entries(routeRules.headers || {})
      .some(([name, value]) => name.toLowerCase() === 'x-robots-tag' && value.toLowerCase().includes('noindex'))

    if (routeRules.redirect || hasRobotsDisabled)
      continue

    // Move valid entries to the front of the array
    sitemapUrls[validCount++] = routeRules.sitemap ? defu(u, routeRules.sitemap) as ResolvedSitemapUrl : u
  }

  // Truncate array to valid entries only
  sitemapUrls.length = validCount

  // 6. nitro hooks
  const locSize = sitemapUrls.length
  const resolvedCtx: SitemapRenderCtx = {
    urls: sitemapUrls,
    sitemapName: sitemapName,
    event,
  }
  await nitro.hooks.callHook('sitemap:resolved', resolvedCtx)
  // we need to normalize any new urls otherwise they won't appear in the final sitemap
  // Note this is risky and users should be using the sitemap:input hook for additions
  if (resolvedCtx.urls.length !== locSize) {
    resolvedCtx.urls = resolvedCtx.urls.map(e => preNormalizeEntry(e, resolvers))
  }

  const maybeSort = (urls: ResolvedSitemapUrl[]) => runtimeConfig.sortEntries ? sortInPlace(urls) : urls
  // final urls
  const normalizedPreDedupe = resolvedCtx.urls.map(e => normaliseEntry(e, definition.defaults, resolvers))
  const urls = maybeSort(mergeOnKey(normalizedPreDedupe, '_key').map(e => normaliseEntry(e, definition.defaults, resolvers)))

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
          statusCode: 404,
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
  const sitemap = urlsToXml(urls, resolvers, runtimeConfig, errorInfo)

  const ctx = { sitemap, sitemapName, event }
  await nitro.hooks.callHook('sitemap:output', ctx)
  return ctx.sitemap
}

// Create cached function for building sitemap XML
const buildSitemapXmlCached = defineCachedFunction(
  buildSitemapXml,
  {
    name: 'sitemap:xml',
    group: 'sitemap',
    maxAge: 60 * 10, // Default 10 minutes
    base: 'sitemap', // Use the sitemap storage
    getKey: (event: H3Event, definition: SitemapDefinition) => {
      // Include headers that could affect the output in the cache key
      const host = getHeader(event, 'host') || getHeader(event, 'x-forwarded-host') || ''
      const proto = getHeader(event, 'x-forwarded-proto') || 'https'
      const sitemapName = definition.sitemapName || 'default'
      return `${sitemapName}-${proto}-${host}`
    },
    swr: true, // Enable stale-while-revalidate
  },
)

export async function createSitemap(event: H3Event, definition: SitemapDefinition, runtimeConfig: ModuleRuntimeConfig) {
  const resolvers = useNitroUrlResolvers(event)

  // Choose between cached or direct generation
  const shouldCache = !import.meta.dev && typeof runtimeConfig.cacheMaxAgeSeconds === 'number' && runtimeConfig.cacheMaxAgeSeconds > 0
  const xml = shouldCache
    ? await buildSitemapXmlCached(event, definition, resolvers, runtimeConfig)
    : await buildSitemapXml(event, definition, resolvers, runtimeConfig)

  // Set headers
  setHeader(event, 'Content-Type', 'text/xml; charset=UTF-8')
  if (runtimeConfig.cacheMaxAgeSeconds) {
    setHeader(event, 'Cache-Control', `public, max-age=${runtimeConfig.cacheMaxAgeSeconds}, s-maxage=${runtimeConfig.cacheMaxAgeSeconds}, stale-while-revalidate=3600`)

    // Add debug headers when caching is enabled
    const now = new Date()
    setHeader(event, 'X-Sitemap-Generated', now.toISOString())
    setHeader(event, 'X-Sitemap-Cache-Duration', `${runtimeConfig.cacheMaxAgeSeconds}s`)

    // Calculate expiry time
    const expiryTime = new Date(now.getTime() + (runtimeConfig.cacheMaxAgeSeconds * 1000))
    setHeader(event, 'X-Sitemap-Cache-Expires', expiryTime.toISOString())

    // Calculate remaining time
    const remainingSeconds = Math.floor((expiryTime.getTime() - now.getTime()) / 1000)
    setHeader(event, 'X-Sitemap-Cache-Remaining', `${remainingSeconds}s`)
  }
  else {
    setHeader(event, 'Cache-Control', `no-cache, no-store`)
  }
  event.context._isSitemap = true
  return xml
}
