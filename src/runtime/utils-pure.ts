import { createDefu } from 'defu'
import { withLeadingSlash } from 'ufo'
import type { FilterInput } from './types'

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

export function splitForLocales(path: string, locales: string[]) {
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
