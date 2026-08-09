import type { H3Event } from '#nuxtseo/h3'
import type {
  ModuleRuntimeConfig,
  NitroUrlResolvers,
  ResolvedSitemapUrl,
  SitemapDefinition,
  SitemapInputCtx,
  SitemapSourcesHookCtx,
} from '../../../types'
import { resolveSitePath } from 'nuxt-site-config/urls'
import { withHttps } from 'ufo'
import { getHeader } from '#nuxtseo/h3'
import { defineCachedFunction, useRuntimeConfig } from '#nuxtseo/nitro'
// @ts-expect-error virtual module
import staticConfig from '#sitemap-virtual/static-config.mjs'
import { logger, resolveI18nSitemapLocaleKey } from '../../../utils-pure'
import { sortInPlace } from '../urlset/sort'
import { childSitemapSources, globalSitemapSources, resolveSitemapSources } from '../urlset/sources'
import { parseChunkInfo, sliceUrlsForChunk } from '../utils/chunk'
import { resolveSitemapEntries } from './entries'

const SERVER_CACHE_MAX_AGE = (staticConfig.cacheMaxAgeSeconds as number | false) || 60 * 10
type NitroApp = ReturnType<typeof import('#nuxtseo/nitro').useNitroApp>

export interface ResolvedSitemapUrlsResult {
  urls: ResolvedSitemapUrl[]
  failedSources: Array<{ url: string, error: string }>
}

// Chunk-agnostic computation: fetch sources, run hooks, normalise, filter, sort.
// Returns the full sorted array; chunked sitemaps slice from this on the way out.
// All chunks of the same base sitemap share one cache entry.
export async function buildResolvedSitemapUrls(
  effectiveSitemap: SitemapDefinition,
  matchName: string,
  isChunked: boolean,
  resolvers: NitroUrlResolvers,
  runtimeConfig: ModuleRuntimeConfig,
  nitro?: NitroApp,
): Promise<ResolvedSitemapUrlsResult> {
  const { sitemaps, autoI18n, isI18nMapped, isMultiSitemap, sortEntries } = runtimeConfig

  let sourcesInput = effectiveSitemap.includeAppSources
    ? [...await globalSitemapSources(), ...await childSitemapSources(effectiveSitemap)]
    : await childSitemapSources(effectiveSitemap)

  if (nitro && resolvers.event) {
    const ctx: SitemapSourcesHookCtx = {
      event: resolvers.event,
      sitemapName: matchName,
      sources: sourcesInput,
    }
    await nitro.hooks.callHook('sitemap:sources', ctx)
    sourcesInput = ctx.sources
  }

  const sources = await resolveSitemapSources(sourcesInput, resolvers.event)

  const failedSources = sources
    .filter(source => source.error && source._isFailure)
    .map(source => ({
      url: typeof source.fetch === 'string' ? source.fetch : (source.fetch?.[0] || 'unknown'),
      error: source.error || 'Unknown error',
    }))

  const resolvedCtx: SitemapInputCtx = {
    urls: sources.flatMap(s => s.urls),
    sitemapName: matchName,
    event: resolvers.event,
  }
  await nitro?.hooks.callHook('sitemap:input', resolvedCtx)
  const enhancedUrls = resolveSitemapEntries(effectiveSitemap, resolvedCtx.urls, { autoI18n, isI18nMapped }, resolvers, useRuntimeConfig().app.baseURL)

  const localeSitemapKeys = isI18nMapped && autoI18n ? autoI18n.locales.map(l => l._sitemap) : []
  if (isMultiSitemap) {
    const sitemapNames = Object.keys(sitemaps).filter(k => k !== 'index')
    const validSitemapNames = new Set(sitemapNames)
    if (isI18nMapped) {
      for (const name of sitemapNames) {
        const localeKey = resolveI18nSitemapLocaleKey(name, localeSitemapKeys)
        if (localeKey)
          validSitemapNames.add(localeKey)
      }
    }
    // @ts-expect-error loose typing
    const warnedSitemaps = nitro?._sitemapWarnedSitemaps || new Set<string>()
    for (const e of enhancedUrls) {
      const hasMatchingSitemap = typeof e._sitemap === 'string' && validSitemapNames.has(e._sitemap)
      if (typeof e._sitemap === 'string' && !hasMatchingSitemap) {
        if (!warnedSitemaps.has(e._sitemap)) {
          warnedSitemaps.add(e._sitemap)
          logger.error(`Sitemap \`${e._sitemap}\` not found in sitemap config. Available sitemaps: ${sitemapNames.join(', ')}. Entry \`${e.loc}\` will be omitted.`)
        }
      }
    }
    if (nitro) {
      // @ts-expect-error loose typing
      nitro._sitemapWarnedSitemaps = warnedSitemaps
    }
  }

  const matchedLocaleSitemap = isI18nMapped ? resolveI18nSitemapLocaleKey(matchName, localeSitemapKeys) : null
  const filteredUrls = enhancedUrls.filter((e) => {
    if (e._sitemap === false)
      return false
    if (isMultiSitemap && e._sitemap && matchName) {
      if (isChunked)
        return e._sitemap === matchName
      if (e._sitemap === matchName)
        return true
      // i18n-mapped custom sitemaps are named `<localeSitemap>-<name>`; resolve the matchName
      // back to its locale key (longest match) so prefix-sharing locales don't collide,
      // e.g. a `zh` URL must not land in the `zh-Hant` sitemap.
      if (isI18nMapped)
        return e._sitemap === matchedLocaleSitemap
      return false
    }
    return true
  })

  const urls = sortEntries ? sortInPlace(filteredUrls) : filteredUrls
  return { urls, failedSources }
}

export const buildResolvedSitemapUrlsCached = defineCachedFunction(
  async (
    _event: H3Event,
    effectiveSitemap: SitemapDefinition,
    matchName: string,
    isChunked: boolean,
    resolvers: NitroUrlResolvers,
    runtimeConfig: ModuleRuntimeConfig,
    nitro?: NitroApp,
  ) => buildResolvedSitemapUrls(effectiveSitemap, matchName, isChunked, resolvers, runtimeConfig, nitro),
  {
    name: 'sitemap:resolved-urls',
    group: 'sitemap',
    base: 'sitemap',
    maxAge: SERVER_CACHE_MAX_AGE,
    getKey: (event, _effectiveSitemap, matchName, isChunked) => {
      const host = getHeader(event, 'host') || getHeader(event, 'x-forwarded-host') || ''
      const proto = getHeader(event, 'x-forwarded-proto') || 'https'
      return `resolved-${isChunked ? 'chunked-' : ''}${matchName}-${proto}-${host}`
    },
    swr: true,
  },
)

// Routes between Nitro's storage-backed cache (production) and direct execution. Chunks of the
// same base sitemap share one cache entry so the source fetch + normalize + sort runs once per
// `cacheMaxAgeSeconds` window. Edge-runtime safe: relies on Nitro's storage layer, no module
// state. Dev and prerender skip the cache so updated sources remain visible.
export async function getResolvedSitemapUrls(
  effectiveSitemap: SitemapDefinition,
  matchName: string,
  isChunked: boolean,
  resolvers: NitroUrlResolvers,
  runtimeConfig: ModuleRuntimeConfig,
  nitro?: NitroApp,
): Promise<ResolvedSitemapUrlsResult> {
  const event = resolvers.event
  const shouldCache = !import.meta.dev && !import.meta.prerender && typeof runtimeConfig.cacheMaxAgeSeconds === 'number' && runtimeConfig.cacheMaxAgeSeconds > 0
  if (shouldCache && event) {
    return buildResolvedSitemapUrlsCached(event, effectiveSitemap, matchName, isChunked, resolvers, runtimeConfig, nitro)
  }
  return buildResolvedSitemapUrls(effectiveSitemap, matchName, isChunked, resolvers, runtimeConfig, nitro)
}

export async function buildSitemapUrls(sitemap: SitemapDefinition, resolvers: NitroUrlResolvers, runtimeConfig: ModuleRuntimeConfig, nitro?: NitroApp): Promise<ResolvedSitemapUrlsResult> {
  const { sitemaps, autoI18n, defaultSitemapsChunkSize } = runtimeConfig

  const chunkSize = defaultSitemapsChunkSize || undefined
  const chunkInfo = parseChunkInfo(sitemap.sitemapName, sitemaps, chunkSize)

  if (autoI18n?.differentDomains) {
    const domain = autoI18n.locales.find(e => e.language === sitemap.sitemapName || e.code === sitemap.sitemapName)?.domain
    if (domain) {
      const _tester = resolvers.canonicalUrlResolver
      resolvers.canonicalUrlResolver = (path: string) => resolveSitePath(path, {
        absolute: true,
        withBase: false,
        siteUrl: withHttps(domain),
        trailingSlash: _tester('/test/').endsWith('/'),
        base: '/',
      })
    }
  }

  // For chunked sitemaps the base sitemap config holds the sources; all chunks share one cache entry.
  let effectiveSitemap = sitemap
  const baseSitemapName = chunkInfo.baseSitemapName
  if (chunkInfo.isChunked && baseSitemapName !== sitemap.sitemapName && sitemaps[baseSitemapName]) {
    effectiveSitemap = sitemaps[baseSitemapName]
  }

  const matchName = chunkInfo.isChunked ? baseSitemapName : sitemap.sitemapName
  const resolved = await getResolvedSitemapUrls(effectiveSitemap, matchName, chunkInfo.isChunked, resolvers, runtimeConfig, nitro)

  // Slice last so all chunks of the same base reuse the cached sorted array.
  const urls = sliceUrlsForChunk(resolved.urls, sitemap.sitemapName, sitemaps, chunkSize)
  return { urls, failedSources: resolved.failedSources }
}

export { urlsToXml, urlsToXmlStream } from './xml'
