import type { H3Event } from '#nuxtseo/h3'
import type { FilterInput, ModuleRuntimeConfig, SitemapsResolvedCtx } from '../types'
import { getHeader } from '#nuxtseo/h3'
import { defineCachedFunction, useNitroApp, useRuntimeConfig } from '#nuxtseo/nitro'
// @ts-expect-error virtual module
import staticConfig from '#sitemap-virtual/static-config.mjs'
import { normalizeRuntimeFilters } from '../utils-pure'

export * from '../utils-pure'

type NitroApp = ReturnType<typeof useNitroApp>

// Read at module init: defineCachedFunction takes a static maxAge. Falls back to 10 minutes
// when caching is disabled in static config (still bypassed at request time via shouldCache).
const SERVER_CACHE_MAX_AGE = (staticConfig.cacheMaxAgeSeconds as number | false) || 60 * 10

// Event-overridable fields only; the rest of the config comes from the static virtual module.
function dynamicRuntimeConfig(e?: H3Event) {
  return useRuntimeConfig(e).sitemap as Partial<ModuleRuntimeConfig> | undefined
}

function copyStaticSitemaps(): ModuleRuntimeConfig['sitemaps'] {
  // Only sitemap definitions are mutated by the index builder, so shallow-copy those instead of
  // serializing and parsing the entire static config (including i18n pages) on every request.
  return Object.fromEntries(
    Object.entries(staticConfig.sitemaps as ModuleRuntimeConfig['sitemaps']).map(([name, sitemap]) => [name, {
      ...sitemap,
      include: normalizeRuntimeFilters('include' in sitemap ? sitemap.include : undefined),
      exclude: normalizeRuntimeFilters('exclude' in sitemap ? sitemap.exclude : undefined),
    }]),
  ) as ModuleRuntimeConfig['sitemaps']
}

export function useSitemapRuntimeConfig(e?: H3Event): ModuleRuntimeConfig {
  return Object.freeze({
    ...staticConfig,
    sitemaps: copyStaticSitemaps(),
    ...dynamicRuntimeConfig(e),
  }) as ModuleRuntimeConfig
}

// Cache storage JSON-serializes values: RegExp becomes {} and functions vanish. Keep filters in
// their literal { regex } form so a cache round-trip survives; normalizeRuntimeFilters accepts
// both shapes when the filter is applied.
function serializeFilters(filters?: FilterInput[]): FilterInput[] | undefined {
  if (!filters?.length)
    return undefined
  return filters.map((f) => {
    if (f instanceof RegExp)
      return { regex: `/${f.source}/${f.flags}` }
    return f
  })
}

// Runs the sitemap:sitemaps-resolved hook so apps can register sitemaps at runtime. Returns the
// sitemaps record only: definitions are small (static sources are stripped at build time), while
// the surrounding config can embed large i18n page maps that must stay out of cache storage.
async function resolveSitemapSitemaps(e: H3Event, nitro: NitroApp): Promise<ModuleRuntimeConfig['sitemaps']> {
  const ctx: SitemapsResolvedCtx = { sitemaps: copyStaticSitemaps(), event: e }
  await nitro.hooks.callHook('sitemap:sitemaps-resolved', ctx)
  const sitemaps = { ...ctx.sitemaps } as ModuleRuntimeConfig['sitemaps']
  for (const name of Object.keys(sitemaps)) {
    const sitemap = { ...sitemaps[name]! } as ModuleRuntimeConfig['sitemaps'][string]
    // Resolve url functions so the record stays JSON-serializable for cache storage
    if (typeof sitemap.urls === 'function')
      sitemap.urls = await sitemap.urls()
    sitemap.include = serializeFilters(sitemap.include)
    sitemap.exclude = serializeFilters(sitemap.exclude)
    sitemaps[name] = sitemap
  }
  return sitemaps
}

// Registration hooks commonly query a database. Cache the resolved record for the same window
// as the rendered XML so the hook cost stays proportional to cacheMaxAgeSeconds.
const resolveSitemapSitemapsCached = defineCachedFunction(
  resolveSitemapSitemaps,
  {
    name: 'sitemap:runtime-sitemaps',
    group: 'sitemap',
    maxAge: SERVER_CACHE_MAX_AGE,
    base: 'sitemap',
    // nitro calls getKey with the full fn args (event, nitro)
    getKey: (e?: H3Event) => {
      const host = (e && (getHeader(e, 'host') || getHeader(e, 'x-forwarded-host'))) || ''
      const proto = (e && getHeader(e, 'x-forwarded-proto')) || 'https'
      return `runtime-sitemaps-${proto}-${host}`
    },
    swr: true,
  },
)

export async function useResolvedSitemapRuntimeConfig(e: H3Event): Promise<ModuleRuntimeConfig> {
  // Cheap gate before any config work: dynamic copy first (env-overridable), static fallback.
  const maxAge = dynamicRuntimeConfig(e)?.cacheMaxAgeSeconds ?? staticConfig.cacheMaxAgeSeconds
  // Dev and prerender always re-run the hook so newly registered sitemaps are visible
  // immediately; production caches the resolved record for the cacheMaxAgeSeconds window.
  const shouldCache = !import.meta.dev && !import.meta.prerender && typeof maxAge === 'number' && maxAge > 0
  const sitemaps = shouldCache
    ? await resolveSitemapSitemapsCached(e, useNitroApp())
    : await resolveSitemapSitemaps(e, useNitroApp())
  return Object.freeze({
    ...staticConfig,
    sitemaps,
    ...dynamicRuntimeConfig(e),
  }) as ModuleRuntimeConfig
}
