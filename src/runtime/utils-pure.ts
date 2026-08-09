import type { LocaleAlternate, RuntimeI18nConfig } from 'nuxtseo-shared/i18n-runtime'
import type { AlternativeEntry, AutoI18nConfig, FilterInput } from './types'
import { createDefu } from 'defu'
import { computeLocaleAlternates, resolveLocaleFromRoute } from 'nuxtseo-shared/i18n-runtime'
import { createFilter, createModuleLogger } from 'nuxtseo-shared/utils'
import { joinURL, parseURL, withHttps, withLeadingSlash, withoutBase } from 'ufo'

export { createFilter, type CreateFilterOptions } from 'nuxtseo-shared/utils'

export const logger = createModuleLogger('@nuxt/sitemap')

const XML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  '\'': '&apos;',
}
const XML_SPECIAL_CHARS_RE = /[&<>"']/g
const HAS_XML_SPECIAL_CHARS_RE = /[&<>"']/

export function xmlEscape(value: string | number | boolean | Date): string {
  const input = String(value)
  return HAS_XML_SPECIAL_CHARS_RE.test(input)
    ? input.replace(XML_SPECIAL_CHARS_RE, char => XML_ENTITIES[char]!)
    : input
}

const merger = createDefu((obj, key, value) => {
  // merge arrays using a set
  if (Array.isArray(obj[key]) && Array.isArray(value))
    // @ts-expect-error untyped
    obj[key] = Array.from(new Set([...obj[key], ...value]))
  return obj[key]
})

export function mergeOnKey<T, K extends keyof T>(arr: T[], key: K, onMerge?: (key: T[K]) => void): T[] {
  if (arr.length < 2)
    return arr

  const seen = new Map<string, number>()

  // Compact in place: all runtime callers pass a temporary array, so a second full-size result
  // allocation only increases peak memory for large sitemaps.
  let resultLength = 0

  for (const item of arr) {
    const k = item[key] as string
    if (seen.has(k)) {
      const existingIndex = seen.get(k)!
      onMerge?.(item[key])
      // @ts-expect-error untyped
      arr[existingIndex] = merger(item, arr[existingIndex])
    }
    else {
      seen.set(k, resultLength)
      arr[resultLength++] = item
    }
  }

  arr.length = resultLength
  return arr
}

export function splitForLocales(path: string, locales: readonly string[] | Set<string>): [string | null, string] {
  // we only want to use the first path segment otherwise we can end up turning "/ending" into "/en/ding"
  const start = path.charCodeAt(0) === 47 ? 1 : 0
  const end = path.indexOf('/', start)
  const prefix = path.slice(start, end === -1 ? path.length : end)
  // make sure prefix is a valid locale
  const hasLocale = locales instanceof Set ? locales.has(prefix) : locales.includes(prefix)
  if (prefix && hasLocale) {
    const prefixEnd = start + prefix.length
    return [prefix, start === 1 ? path.slice(prefixEnd) : path]
  }
  return [null, path]
}

export interface ResolvedI18nRouteEntry {
  locale: AutoI18nConfig['locales'][number]
  loc: string
  alternatives: AlternativeEntry[]
}

function toRuntimeI18nConfig(i18n: AutoI18nConfig): RuntimeI18nConfig {
  return {
    ...i18n,
    // Sitemap transforms keep the unprefixed default URL alongside Nuxt's prefixed route.
    strategy: i18n.strategy === 'prefix_and_default' ? 'prefix_except_default' : i18n.strategy,
    pages: i18n.pages && Object.fromEntries(
      Object.entries(i18n.pages).map(([pageName, pageLocales]) => [
        pageName,
        Object.fromEntries(i18n.locales.map((locale) => {
          const configuredPath = pageLocales[locale.code]
          return [locale.code, configuredPath === undefined ? withLeadingSlash(pageName) : configuredPath]
        })),
      ]),
    ),
    locales: i18n.locales.map(locale => ({
      ...locale,
      hreflang: locale._hreflang,
    })),
  }
}

function localeAlternateHref(alternate: LocaleAlternate): string {
  return alternate.domain
    ? joinURL(withHttps(alternate.domain), alternate.path)
    : alternate.path
}

export function resolveI18nRouteEntries(route: string, i18n: AutoI18nConfig, includeHref: (href: string) => boolean = () => true): ResolvedI18nRouteEntry[] {
  const runtimeConfig = toRuntimeI18nConfig(i18n)
  const currentLocale = resolveLocaleFromRoute(route, runtimeConfig).locale
  const alternates = computeLocaleAlternates(route, runtimeConfig, { locale: currentLocale })
  const localizedAlternates = alternates.map(alternate => ({
    alternate,
    href: localeAlternateHref(alternate),
  }))
  const defaultHref = localizedAlternates.find(({ alternate }) => alternate.code === i18n.defaultLocale)?.href
  const sitemapAlternatives: AlternativeEntry[] = [
    ...(defaultHref && includeHref(defaultHref) ? [{ hreflang: 'x-default', href: defaultHref }] : []),
    ...localizedAlternates
      .filter(({ href }) => includeHref(href))
      .map(({ alternate, href }) => ({ hreflang: alternate.hreflang, href })),
  ]

  return localizedAlternates.flatMap(({ alternate, href }) => {
    const locale = i18n.locales.find(locale => locale.code === alternate.code)
    return locale ? [{ locale, loc: href, alternatives: sitemapAlternatives }] : []
  })
}

/**
 * Resolve which locale a multi-sitemap name belongs to.
 *
 * i18n-mapped sitemaps are named either `<localeSitemap>` (default) or
 * `<localeSitemap>-<name>` (custom sitemaps). Locale `_sitemap` keys can share a
 * prefix (e.g. `zh` and `zh-Hant`), so a naive `name.startsWith(`${key}-`)` check
 * collides: `zh-Hant` would match the `zh` locale. Resolve by the longest matching
 * key to disambiguate.
 */
export function resolveI18nSitemapLocaleKey(sitemapName: string, localeSitemapKeys: string[]): string | null {
  let best: string | null = null
  for (const key of localeSitemapKeys) {
    if (sitemapName === key || sitemapName.startsWith(`${key}-`)) {
      if (best === null || key.length > best.length)
        best = key
    }
  }
  return best
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

export function createPathFilter(options: { include?: (FilterInput | string | RegExp)[], exclude?: (FilterInput | string | RegExp)[] } = {}, baseURL?: string) {
  const urlFilter = createFilter({
    include: normalizeRuntimeFilters(options.include),
    exclude: normalizeRuntimeFilters(options.exclude),
  })
  const hasBase = baseURL && baseURL !== '/'
  return (loc: string, pathname?: string) => {
    let path = pathname
    if (typeof path !== 'string') {
      try {
        // e.loc is absolute here
        path = parseURL(loc).pathname
      }
      catch {
        // invalid URL
        return false
      }
    }
    if (hasBase)
      path = withoutBase(path, baseURL)
    return urlFilter(withLeadingSlash(path))
  }
}
