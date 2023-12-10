import { createDefu } from 'defu'
import type { FilterTypes, RegexObjectType } from './types'

const regexPattern = /\/(.*?)\/([gimsuy]*)$/
const merger = createDefu((obj, key, value) => {
  // merge arrays using a set
  if (Array.isArray(obj[key]) && Array.isArray(value))
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

/**
 * Check if a filter is valid, otherwise exclude it
 * @param filter string | RegExp | RegexObjectType
 * 
 */

export function isValidFilter(filter: FilterTypes['include'] | FilterTypes['exclude']) {
  if (typeof filter === 'string' || filter instanceof RegExp || typeof filter === 'object' && filter.regex)
    return true

  return false
}

/**
 * Transform the RegeExp into RegexObjectType
 * @param filter string | RegExp | RegexObjectType
 * @return Object | string
 */

export function normaliseRegexp(filter: FilterTypes['include'] | FilterTypes['exclude']) : FilterTypes['include'] | FilterTypes['exclude']{
  
  if (filter instanceof RegExp)
    return { regex: filter.toString() }

  else if ( typeof filter === 'object' && filter.regex && filter.regex as any instanceof RegExp)
    return { regex: filter.regex.toString() }

  return filter 
}

/**
 * Transform a literal notation string regex to RegExp
 * @param rule
 * @return RegExp
 */
export function transformIntoRegex(rule: RegexObjectType | RegExp | string): RegExp | string {
  if (rule instanceof RegExp || typeof rule === 'string')
    return rule
  const match = rule.regex.match(regexPattern)
  if (!match || match.length < 3){
    throw new Error(`Invalid regex rule: ${rule.regex}`)
  }
  return new RegExp(match[1], match[2])
}