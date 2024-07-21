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

export function mergeOnKey<T, K extends keyof T>(arr: T[], key: K) {
  const res: Record<string, T> = {}
  arr.forEach((item) => {
    const k = item[key] as string
    // @ts-expect-error untyped
    res[k] = merger(item, res[k] || {})
  })
  return Object.values(res)
}

export function splitForLocales(path: string, locales: string[]): [string | null, string] {
  // we only want to use the first path segment otherwise we can end up turning "/ending" into "/en/ding"
  const prefix = withLeadingSlash(path).split('/')[1]
  // make sure prefix is a valid locale
  if (locales.includes(prefix))
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
      return new RegExp(match[1], match[2])
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

export function createFilter(options: CreateFilterOptions = {}): (path: string) => boolean {
  const include = options.include || []
  const exclude = options.exclude || []
  if (include.length === 0 && exclude.length === 0)
    return () => true

  return function (path: string): boolean {
    for (const v of [{ rules: exclude, result: false }, { rules: include, result: true }]) {
      const regexRules = v.rules.filter(r => r instanceof RegExp) as RegExp[]

      if (regexRules.some(r => r.test(path)))
        return v.result

      const stringRules = v.rules.filter(r => typeof r === 'string') as string[]
      if (stringRules.length > 0) {
        const routes = {}
        for (const r of stringRules) {
          // quick scan of literal string matches
          if (r === path)
            return v.result

          // need to flip the array data for radix3 format, true value is arbitrary
          // @ts-expect-error untyped
          routes[r] = true
        }
        const routeRulesMatcher = toRouteMatcher(createRouter({ routes, strictTrailingSlash: false }))
        if (routeRulesMatcher.matchAll(path).length > 0)
          return Boolean(v.result)
      }
    }
    return include.length === 0
  }
}
