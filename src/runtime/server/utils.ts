import type { H3Event } from 'h3'
import type { ModuleRuntimeConfig } from '../types'
import { useRuntimeConfig } from 'nitropack/runtime'
// @ts-expect-error virtual module
import staticConfig from '#sitemap-virtual/static-config.mjs'
import { normalizeRuntimeFilters } from '../utils-pure'

export * from '../utils-pure'

// XML escape function for content inserted into XML/XSL
export function xmlEscape(str: string | number | boolean | Date): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function useSitemapRuntimeConfig(e?: H3Event): ModuleRuntimeConfig {
  // Static fields live in a virtual module; only env-overridable fields go through runtimeConfig.
  // we still need to clone so callers can mutate without affecting the shared module-scope copy
  const clone = JSON.parse(JSON.stringify(staticConfig)) as ModuleRuntimeConfig
  for (const k in clone.sitemaps) {
    const sitemap = clone.sitemaps[k]!
    sitemap.include = normalizeRuntimeFilters(sitemap.include)
    sitemap.exclude = normalizeRuntimeFilters(sitemap.exclude)
    clone.sitemaps[k] = sitemap
  }
  Object.assign(clone, useRuntimeConfig(e).sitemap)
  return Object.freeze(clone)
}
