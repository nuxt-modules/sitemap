import { bench, describe } from 'vitest'
import { joinURL, withHttps } from 'ufo'
import { preNormalizeEntry } from '../../src/runtime/server/sitemap/urlset/normalise'
import { createPathFilter, splitForLocales } from '../../src/runtime/utils-pure'
import type { AlternativeEntry, AutoI18nConfig, ModuleRuntimeConfig, NitroUrlResolvers, ResolvedSitemapUrl, SitemapDefinition, SitemapUrl, SitemapUrlInput } from '../../src/runtime/types'

interface NormalizedI18n extends ResolvedSitemapUrl {
  _pathWithoutPrefix: string
  _locale: AutoI18nConfig['locales'][number]
  _index?: number
}

function getPageKey(pathWithoutPrefix: string): string {
  const stripped = pathWithoutPrefix[0] === '/' ? pathWithoutPrefix.slice(1) : pathWithoutPrefix
  return stripped.endsWith('/index') ? stripped.slice(0, -6) || 'index' : stripped || 'index'
}

// Implementation matching src/runtime/server/sitemap/builder/sitemap.ts
function resolveSitemapEntries(sitemap: SitemapDefinition, urls: SitemapUrlInput[], runtimeConfig: Pick<ModuleRuntimeConfig, 'autoI18n' | 'isI18nMapped'>, resolvers?: NitroUrlResolvers): ResolvedSitemapUrl[] {
  const {
    autoI18n,
    isI18nMapped,
  } = runtimeConfig
  const filterPath = createPathFilter({
    include: sitemap.include,
    exclude: sitemap.exclude,
  })
  const _urls = urls.map((_e) => {
    const e = preNormalizeEntry(_e, resolvers)
    if (!e.loc || !filterPath(e.loc))
      return false
    return e
  }).filter(Boolean) as ResolvedSitemapUrl[]

  let validI18nUrlsForTransform: NormalizedI18n[] = []
  const withoutPrefixPaths: Record<string, NormalizedI18n[]> = {}
  if (autoI18n && autoI18n.strategy !== 'no_prefix') {
    const localeCodes = autoI18n.locales.map(l => l.code)
    const localeByCode = new Map(autoI18n.locales.map(l => [l.code, l]))
    const isPrefixStrategy = autoI18n.strategy === 'prefix'
    const isPrefixExceptOrAndDefault = autoI18n.strategy === 'prefix_and_default' || autoI18n.strategy === 'prefix_except_default'
    const xDefaultAndLocales = [{ code: 'x-default', _hreflang: 'x-default' }, ...autoI18n.locales] as Array<{ code: string, _hreflang: string }>
    const defaultLocale = autoI18n.defaultLocale
    const hasPages = !!autoI18n.pages
    const hasDifferentDomains = !!autoI18n.differentDomains

    validI18nUrlsForTransform = _urls.map((_e, i) => {
      if (_e._abs)
        return false
      const split = splitForLocales(_e._relativeLoc, localeCodes)
      let localeCode = split[0]
      const pathWithoutPrefix = split[1]
      if (!localeCode)
        localeCode = defaultLocale
      const e = _e as NormalizedI18n
      e._pathWithoutPrefix = pathWithoutPrefix
      const locale = localeByCode.get(localeCode)
      if (!locale)
        return false
      e._locale = locale
      e._index = i
      e._key = `${e._sitemap || ''}${e._path?.pathname || '/'}${e._path?.search || ''}`
      withoutPrefixPaths[pathWithoutPrefix] = withoutPrefixPaths[pathWithoutPrefix] || []
      if (!withoutPrefixPaths[pathWithoutPrefix].some(e => e._locale.code === locale.code))
        withoutPrefixPaths[pathWithoutPrefix].push(e)
      return e
    }).filter(Boolean) as NormalizedI18n[]

    for (const e of validI18nUrlsForTransform) {
      if (!e._i18nTransform && !e.alternatives?.length) {
        const alternatives = (withoutPrefixPaths[e._pathWithoutPrefix] || [])
          .map((u) => {
            const entries: AlternativeEntry[] = []
            if (u._locale.code === defaultLocale) {
              entries.push({
                href: u.loc,
                hreflang: 'x-default',
              })
            }
            entries.push({
              href: u.loc,
              hreflang: u._locale._hreflang || defaultLocale,
            })
            return entries
          })
          .flat()
          .filter(Boolean) as AlternativeEntry[]
        if (alternatives.length)
          e.alternatives = alternatives
      }
      else if (e._i18nTransform) {
        delete e._i18nTransform
        if (hasDifferentDomains) {
          const defLocale = localeByCode.get(defaultLocale)
          e.alternatives = [
            {
              ...defLocale,
              code: 'x-default',
            },
            ...autoI18n.locales
              .filter(l => !!l.domain),
          ]
            .map((locale) => {
              return {
                hreflang: locale._hreflang!,
                href: joinURL(withHttps(locale.domain!), e._pathWithoutPrefix),
              }
            })
        }
        else {
          const pageKey = hasPages ? getPageKey(e._pathWithoutPrefix) : ''
          const pageMappings = hasPages ? autoI18n.pages![pageKey] : undefined
          const pathSearch = e._path?.search || ''
          const pathWithoutPrefix = e._pathWithoutPrefix

          for (const l of autoI18n.locales) {
            let loc = pathWithoutPrefix

            if (hasPages && pageMappings && pageMappings[l.code] !== undefined) {
              const customPath = pageMappings[l.code]
              if (customPath === false)
                continue
              if (typeof customPath === 'string')
                loc = customPath[0] === '/' ? customPath : `/${customPath}`
            }
            else if (!hasDifferentDomains && !(isPrefixExceptOrAndDefault && l.code === defaultLocale)) {
              loc = joinURL(`/${l.code}`, pathWithoutPrefix)
            }

            const _sitemap = isI18nMapped ? l._sitemap : undefined
            const alternatives: AlternativeEntry[] = []
            for (const locale of xDefaultAndLocales) {
              const code = locale.code === 'x-default' ? defaultLocale : locale.code
              const isDefault = locale.code === 'x-default' || locale.code === defaultLocale
              let href = pathWithoutPrefix

              if (hasPages && pageMappings && pageMappings[code] !== undefined) {
                const customPath = pageMappings[code]
                if (customPath === false)
                  continue
                if (typeof customPath === 'string')
                  href = customPath[0] === '/' ? customPath : `/${customPath}`
              }
              else if (isPrefixStrategy) {
                href = joinURL('/', code, pathWithoutPrefix)
              }
              else if (isPrefixExceptOrAndDefault && !isDefault) {
                href = joinURL('/', code, pathWithoutPrefix)
              }

              if (!filterPath(href))
                continue
              alternatives.push({
                hreflang: locale._hreflang,
                href,
              })
            }

            const { _index: _, ...rest } = e
            const newEntry = preNormalizeEntry({
              _sitemap,
              ...rest,
              _key: `${_sitemap || ''}${loc || '/'}${pathSearch}`,
              _locale: l,
              loc,
              alternatives,
            } as SitemapUrl, resolvers) as NormalizedI18n
            if (e._locale.code === newEntry._locale.code) {
              _urls[e._index!] = newEntry
              e._index = undefined
            }
            else {
              _urls.push(newEntry)
            }
          }
        }
      }
      if (isI18nMapped) {
        e._sitemap = e._sitemap || e._locale._sitemap
        e._key = `${e._sitemap || ''}${e.loc || '/'}${e._path?.search || ''}`
      }
      if (e._index)
        _urls[e._index] = e
    }
  }
  return _urls
}

const resolvers: NitroUrlResolvers = {
  canonicalUrlResolver: (url: string) => `https://example.com${url}`,
  relativeBaseUrlResolver: (url: string) => url,
  fixSlashes: (url: string) => url,
}

const sitemap: SitemapDefinition = {
  sitemapName: 'default',
  include: undefined,
  exclude: undefined,
}

const locales = ['en', 'fr', 'de', 'es', 'it', 'pt', 'nl', 'pl', 'ru', 'ja'].map(code => ({
  code,
  language: code,
  _sitemap: code,
  _hreflang: code,
}))

const autoI18nPrefix: AutoI18nConfig = {
  locales,
  defaultLocale: 'en',
  strategy: 'prefix',
}

const autoI18nPrefixExceptDefault: AutoI18nConfig = {
  locales,
  defaultLocale: 'en',
  strategy: 'prefix_except_default',
}

// URLs with i18n prefixes (1000 urls across 10 locales)
const i18nUrls: SitemapUrlInput[] = locales.flatMap(locale =>
  Array.from({ length: 100 }, (_, i) => ({
    loc: `/${locale.code}/page-${i}`,
    lastmod: '2024-01-01',
  })),
)

// URLs that need _i18nTransform (each expands to 10 locale variants)
const transformUrls: SitemapUrlInput[] = Array.from({ length: 200 }, (_, i) => ({
  loc: `/page-${i}`,
  lastmod: '2024-01-01',
  _i18nTransform: true,
}))

// Simple URLs without i18n
const simpleUrls: SitemapUrlInput[] = Array.from({ length: 1000 }, (_, i) => ({
  loc: `/page-${i}`,
  lastmod: '2024-01-01',
}))

// Mixed URLs with various features
const mixedUrls: SitemapUrlInput[] = Array.from({ length: 1000 }, (_, i) => ({
  loc: `/page-${i}?foo=bar`,
  lastmod: '2024-01-01',
  changefreq: 'weekly' as const,
  priority: 0.8,
}))

describe('resolveSitemapEntries', () => {
  bench('1000 simple urls (no i18n)', () => {
    resolveSitemapEntries(sitemap, simpleUrls, { autoI18n: undefined, isI18nMapped: false }, resolvers)
  }, { iterations: 100 })

  bench('1000 mixed urls with query (no i18n)', () => {
    resolveSitemapEntries(sitemap, mixedUrls, { autoI18n: undefined, isI18nMapped: false }, resolvers)
  }, { iterations: 100 })

  bench('1000 i18n urls (prefix)', () => {
    resolveSitemapEntries(sitemap, i18nUrls, { autoI18n: autoI18nPrefix, isI18nMapped: false }, resolvers)
  }, { iterations: 50 })

  bench('1000 i18n urls (prefix_except_default)', () => {
    resolveSitemapEntries(sitemap, i18nUrls, { autoI18n: autoI18nPrefixExceptDefault, isI18nMapped: false }, resolvers)
  }, { iterations: 50 })

  bench('200 urls _i18nTransform (prefix)', () => {
    resolveSitemapEntries(sitemap, transformUrls, { autoI18n: autoI18nPrefix, isI18nMapped: false }, resolvers)
  }, { iterations: 20 })

  bench('200 urls _i18nTransform (prefix_except_default)', () => {
    resolveSitemapEntries(sitemap, transformUrls, { autoI18n: autoI18nPrefixExceptDefault, isI18nMapped: false }, resolvers)
  }, { iterations: 20 })
})
