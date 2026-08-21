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

export function useSitemapRuntimeConfig(e?: H3Event): ModuleRuntimeConfig {
  // Static fields live in a virtual module; only env-overridable fields go through runtimeConfig.
  // Only sitemap definitions are mutated by the index builder, so shallow-copy those instead of
  // serializing and parsing the entire static config (including i18n pages) on every request.
  const sitemaps = Object.fromEntries(
    Object.entries(staticConfig.sitemaps as ModuleRuntimeConfig['sitemaps']).map(([name, sitemap]) => [name, {
      ...sitemap,
      include: normalizeRuntimeFilters('include' in sitemap ? sitemap.include : undefined),
      exclude: normalizeRuntimeFilters('exclude' in sitemap ? sitemap.exclude : undefined),
    }]),
  ) as ModuleRuntimeConfig['sitemaps']
  return Object.freeze({
    ...staticConfig,
    sitemaps,
    ...useRuntimeConfig(e).sitemap,
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

// Runs the sitemap:sitemaps-resolved hook so apps can register sitemaps at runtime. The
// merged config drives the sitemap index, child sitemap routing, and the sitemap:sources
// hook, so registered sitemaps behave exactly like static ones.
async function resolveSitemapRuntimeConfig(base: ModuleRuntimeConfig, e: H3Event, nitro: NitroApp): Promise<ModuleRuntimeConfig> {
  const ctx: SitemapsResolvedCtx = { sitemaps: base.sitemaps, event: e }
  await nitro.hooks.callHook('sitemap:sitemaps-resolved', ctx)
  const sitemaps = { ...ctx.sitemaps } as ModuleRuntimeConfig['sitemaps']
  for (const name of Object.keys(sitemaps)) {
    const sitemap = { ...sitemaps[name]! } as ModuleRuntimeConfig['sitemaps'][string]
    // Resolve url functions so the merged config stays JSON-serializable for cache storage
    if (typeof sitemap.urls === 'function')
      sitemap.urls = await sitemap.urls()
    sitemap.include = serializeFilters(sitemap.include)
    sitemap.exclude = serializeFilters(sitemap.exclude)
    sitemaps[name] = sitemap
  }
  return Object.freeze({ ...base, sitemaps })
}

// Registration hooks commonly query a database. Cache the merged config for the same window
// as the rendered XML so the hook cost stays proportional to cacheMaxAgeSeconds.
const resolveSitemapRuntimeConfigCached = defineCachedFunction(
  resolveSitemapRuntimeConfig,
  {
    name: 'sitemap:runtime-config',
    group: 'sitemap',
    maxAge: SERVER_CACHE_MAX_AGE,
    base: 'sitemap',
    // nitro calls getKey with the full fn args (base, event, nitro); key on the event
    getKey: (_base: unknown, e?: H3Event) => {
      const host = (e && (getHeader(e, 'host') || getHeader(e, 'x-forwarded-host'))) || ''
      const proto = (e && getHeader(e, 'x-forwarded-proto')) || 'https'
      return `runtime-sitemaps-${proto}-${host}`
    },
    swr: true,
  },
)

export async function useResolvedSitemapRuntimeConfig(e: H3Event): Promise<ModuleRuntimeConfig> {
  const base = useSitemapRuntimeConfig(e)
  const nitro = useNitroApp()
  // Dev and prerender always re-run the hook so newly registered sitemaps are visible
  // immediately; production caches the merged config for the cacheMaxAgeSeconds window.
  const shouldCache = !import.meta.dev && !import.meta.prerender && typeof base.cacheMaxAgeSeconds === 'number' && base.cacheMaxAgeSeconds > 0
  if (shouldCache)
    return resolveSitemapRuntimeConfigCached(base, e, nitro)
  return resolveSitemapRuntimeConfig(base, e, nitro)
}
