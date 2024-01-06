import type { FilterInput, ModuleRuntimeConfig } from './types'
import { useRuntimeConfig } from '#imports'

export * from './utils-pure'

const StringifiedRegExpPattern = /\/(.*?)\/([gimsuy]*)$/

/**
 * Transform a literal notation string regex to RegExp
 */
export function normalizeRuntimeFilters(input?: FilterInput[]): (RegExp | string)[] {
  return (input || []).map((rule) => {
    if (rule instanceof RegExp || typeof rule === 'string')
      return rule
    // regex is already validated
    const match = rule.regex.match(StringifiedRegExpPattern)
    if (match)
      return new RegExp(match[1], match[2])
    return false
  }).filter(Boolean) as (RegExp | string)[]
}

export function useSimpleSitemapRuntimeConfig() {
  // we need to clone with this hack so that we can write to the config
  const clone = JSON.parse(JSON.stringify(useRuntimeConfig().sitemap)) as any as ModuleRuntimeConfig
  // normalize the filters for runtime
  for (const k in clone.sitemaps) {
    const sitemap = clone.sitemaps[k]
    sitemap.include = normalizeRuntimeFilters(sitemap.include)
    sitemap.exclude = normalizeRuntimeFilters(sitemap.exclude)
    clone.sitemaps[k] = sitemap
  }
  // avoid mutation
  return Object.freeze(clone)
}
