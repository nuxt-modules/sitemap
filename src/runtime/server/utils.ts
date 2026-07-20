import type { H3Event } from 'h3'
import type { ModuleRuntimeConfig } from '../types'
import { useRuntimeConfig } from 'nitropack/runtime'
// @ts-expect-error virtual module
import staticConfig from '#sitemap-virtual/static-config.mjs'
import { normalizeRuntimeFilters } from '../utils-pure'

export * from '../utils-pure'

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
