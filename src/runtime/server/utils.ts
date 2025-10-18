import type { H3Event } from 'h3'
import { useRuntimeConfig } from 'nitropack/runtime'
import type { ModuleRuntimeConfig } from '../types'
import { normalizeRuntimeFilters } from '../utils-pure'

export * from '../utils-pure'

// XML escape function for content inserted into XML/XSL
export function xmlEscape(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function useSitemapRuntimeConfig(e?: H3Event): ModuleRuntimeConfig {
  // we need to clone with this hack so that we can write to the config
  const clone = JSON.parse(JSON.stringify(useRuntimeConfig(e).sitemap)) as any as ModuleRuntimeConfig
  // normalize the filters for runtime
  for (const k in clone.sitemaps) {
    const sitemap = clone.sitemaps[k]
    if (!sitemap) continue
    sitemap.include = normalizeRuntimeFilters(sitemap.include)
    sitemap.exclude = normalizeRuntimeFilters(sitemap.exclude)
    clone.sitemaps[k] = sitemap
  }
  // avoid mutation
  return Object.freeze(clone)
}
