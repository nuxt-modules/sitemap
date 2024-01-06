import type { FilterInput } from '../runtime/types'

/**
 * Check if a filter is valid, otherwise exclude it
 * @param filter string | RegExp | RegexObjectType
 *
 */
function isValidFilter(filter: FilterInput): boolean {
  if (typeof filter === 'string')
    return true
  if (filter instanceof RegExp)
    return true
  if (typeof filter === 'object' && typeof filter.regex === 'string')
    return true
  // check if the object has a toString() function
  return false
}

/**
 * Transform the RegeExp into RegexObjectType
 */
export function normalizeFilters(filters: FilterInput[] | undefined) {
  return (filters || []).map((filter) => {
    if (!isValidFilter(filter)) {
      console.warn(`[@nuxtjs/sitemap] You have provided an invalid filter: ${filter}, ignoring.`)
      return false
    }
    // regex needs to be converted into an object that can be serialized
    return filter instanceof RegExp ? { regex: filter.toString() } : filter
  }).filter(Boolean) as FilterInput[]
}
