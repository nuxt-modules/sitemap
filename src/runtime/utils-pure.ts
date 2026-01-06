import { createDefu } from 'defu'
import { parseURL, withLeadingSlash } from 'ufo'
import { createRouter, toRouteMatcher } from 'radix3'
import { createConsola } from 'consola'
import type { FilterInput } from './types'

export const logger = createConsola({
  defaults: {
    tag: '@nuxt/sitemap',
  },
})

const merger = createDefu((obj, key, value) => {
  // merge arrays using a set
  if (Array.isArray(obj[key]) && Array.isArray(value))
    // @ts-expect-error untyped
    obj[key] = Array.from(new Set([...obj[key], ...value]))
  return obj[key]
})

export function mergeOnKey<T, K extends keyof T>(arr: T[], key: K): T[] {
  const seen = new Map<string, number>()

  // Pre-allocate result array to avoid resizing
  let resultLength = 0
  const result: T[] = Array.from({ length: arr.length })

  for (const item of arr) {
    const k = item[key] as string
    if (seen.has(k)) {
      const existingIndex = seen.get(k)!
      // @ts-expect-error untyped
      result[existingIndex] = merger(item, result[existingIndex])
    }
    else {
      seen.set(k, resultLength)
      result[resultLength++] = item
    }
  }

  // Truncate in-place instead of creating a copy via slice
  result.length = resultLength
  return result
}

export function splitForLocales(path: string, locales: string[]): [string | null, string] {
  // we only want to use the first path segment otherwise we can end up turning "/ending" into "/en/ding"
  const prefix = withLeadingSlash(path).split('/')[1]
  // make sure prefix is a valid locale
  if (prefix && locales.includes(prefix))
    return [prefix, path.replace(`/${prefix}`, '')]
  return [null, path]
}

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
      return new RegExp(match[1]!, match[2])
    return false
  }).filter(Boolean) as (RegExp | string)[]
}

export interface CreateFilterOptions {
  include?: (FilterInput | string | RegExp)[]
  exclude?: (FilterInput | string | RegExp)[]
}

export function createPathFilter(options: CreateFilterOptions = {}) {
  const urlFilter = createFilter(options)
  return (loc: string) => {
    let path = loc
    try {
      // e.loc is absolute here
      path = parseURL(loc).pathname
    }
    catch {
      // invalid URL
      return false
    }
    return urlFilter(path)
  }
}

export interface PageMatch {
  mappings: Record<string, string | false>
  paramSegments: string[]
}

export function findPageMapping(pathWithoutPrefix: string, pages: Record<string, Record<string, string | false>>): PageMatch | null {
  const stripped = pathWithoutPrefix[0] === '/' ? pathWithoutPrefix.slice(1) : pathWithoutPrefix
  const pageKey = stripped.endsWith('/index') ? stripped.slice(0, -6) || 'index' : stripped || 'index'

  // exact match
  if (pages[pageKey])
    return { mappings: pages[pageKey], paramSegments: [] }

  // prefix matching for dynamic routes (e.g., 'posts/2' matches 'posts' key)
  // sort by length desc to match most specific first
  const sortedKeys = Object.keys(pages).sort((a, b) => b.length - a.length)
  for (const key of sortedKeys) {
    if (pageKey.startsWith(key + '/')) {
      const paramPath = pageKey.slice(key.length + 1)
      return { mappings: pages[key], paramSegments: paramPath.split('/') }
    }
  }

  return null
}

export function applyDynamicParams(customPath: string, paramSegments: string[]): string {
  if (!paramSegments.length)
    return customPath
  let i = 0
  return customPath.replace(/\[[^\]]+\]/g, () => paramSegments[i++] || '')
}

export function createFilter(options: CreateFilterOptions = {}): (path: string) => boolean {
  const include = options.include || []
  const exclude = options.exclude || []
  if (include.length === 0 && exclude.length === 0)
    return () => true

  // Pre-compute regex and string rules once
  const excludeRegex = exclude.filter(r => r instanceof RegExp) as RegExp[]
  const includeRegex = include.filter(r => r instanceof RegExp) as RegExp[]
  const excludeStrings = exclude.filter(r => typeof r === 'string') as string[]
  const includeStrings = include.filter(r => typeof r === 'string') as string[]

  // Pre-create routers once (expensive operation)
  const excludeMatcher = excludeStrings.length > 0
    ? toRouteMatcher(createRouter({
        routes: Object.fromEntries(excludeStrings.map(r => [r, true])),
        strictTrailingSlash: false,
      }))
    : null
  const includeMatcher = includeStrings.length > 0
    ? toRouteMatcher(createRouter({
        routes: Object.fromEntries(includeStrings.map(r => [r, true])),
        strictTrailingSlash: false,
      }))
    : null

  // Pre-create Sets for O(1) exact match lookups
  const excludeExact = new Set(excludeStrings)
  const includeExact = new Set(includeStrings)

  return function (path: string): boolean {
    // Check exclude rules first
    if (excludeRegex.some(r => r.test(path)))
      return false
    if (excludeExact.has(path))
      return false
    if (excludeMatcher && excludeMatcher.matchAll(path).length > 0)
      return false

    // Check include rules
    if (includeRegex.some(r => r.test(path)))
      return true
    if (includeExact.has(path))
      return true
    if (includeMatcher && includeMatcher.matchAll(path).length > 0)
      return true

    return include.length === 0
  }
}
