import type {
  AlternativeEntry,
  AutoI18nConfig,
  ModuleRuntimeConfig,
  NitroUrlResolvers,
  ResolvedSitemapUrl,
  SitemapDefinition,
  SitemapUrl,
  SitemapUrlInput,
} from '../../../types'
import { parseURL } from 'ufo'
import { createPathFilter, resolveI18nRouteEntries, resolveI18nSitemapLocaleKey, splitForLocales } from '../../../utils-pure'
import { preNormalizeEntry } from '../urlset/normalise'

export interface NormalizedI18n extends ResolvedSitemapUrl {
  _pathWithoutPrefix: string
  _locale: AutoI18nConfig['locales'][number]
  _index?: number
}

export function resolveSitemapEntries(sitemap: SitemapDefinition, urls: SitemapUrlInput[], runtimeConfig: Pick<ModuleRuntimeConfig, 'autoI18n' | 'isI18nMapped'>, resolvers?: NitroUrlResolvers, baseURL?: string): ResolvedSitemapUrl[] {
  const {
    autoI18n,
    isI18nMapped,
  } = runtimeConfig
  const hasFilters = !!sitemap.include?.length || !!sitemap.exclude?.length
  const filterPath = hasFilters
    ? createPathFilter({
        include: sitemap.include,
        exclude: sitemap.exclude,
      }, baseURL || '/')
    : undefined
  const domainLocaleCodes = autoI18n?.multiDomainLocales && autoI18n.strategy !== 'no_prefix' ? new Set(autoI18n.locales.map(l => l.code)) : undefined
  const domainLocaleKeys = autoI18n?.multiDomainLocales ? autoI18n.locales.map(l => l._sitemap) : []
  // 1. normalise
  const _urls: ResolvedSitemapUrl[] = []
  for (const _e of urls) {
    const e = preNormalizeEntry(_e, resolvers)
    if (autoI18n && domainLocaleCodes && !e._abs && !e._i18nTransform) {
      const prefix = splitForLocales(e._path?.pathname || '/', domainLocaleCodes)[0]
      const localeCode = prefix || autoI18n.defaultLocale
      const sitemapLocale = typeof e._sitemap === 'string' ? resolveI18nSitemapLocaleKey(e._sitemap, domainLocaleKeys) : null
      const locale = autoI18n.locales.find(l => l.code === localeCode)
      // Nuxt emits every domain's default route. Keep only this domain's valid variant.
      if (autoI18n.strategy === 'prefix_except_default' && prefix === autoI18n.defaultLocale)
        continue
      if (sitemapLocale && sitemapLocale !== locale?._sitemap)
        continue
      if (e.alternatives?.length) {
        const alternatives = e.alternatives.filter((alternative) => {
          if (alternative.hreflang === 'x-default')
            return false
          const alternateLocale = autoI18n.locales.find(l => l._hreflang === alternative.hreflang)
          if (!alternateLocale)
            return true
          const alternatePrefix = splitForLocales(parseURL(alternative.href.toString()).pathname || '/', domainLocaleCodes)[0]
          if (autoI18n.strategy === 'prefix_except_default' && alternatePrefix === autoI18n.defaultLocale)
            return false
          return (alternatePrefix || autoI18n.defaultLocale) === alternateLocale.code
        })
        const defaultHreflang = autoI18n.locales.find(l => l.code === autoI18n.defaultLocale)?._hreflang
        const defaultAlternative = alternatives.find(a => a.hreflang === defaultHreflang)
        e.alternatives = defaultAlternative ? [...alternatives, { ...defaultAlternative, hreflang: 'x-default' }] : alternatives
      }
    }
    if (e.loc && (!filterPath || filterPath(e.loc, e._path?.pathname)))
      _urls.push(e)
  }

  const withoutPrefixPaths: Record<string, NormalizedI18n[]> = {}
  if (autoI18n && autoI18n.strategy !== 'no_prefix') {
    const localeCodes = new Set(autoI18n.locales.map(l => l.code))
    // Create locale lookup Map for O(1) access
    const localeByCode = new Map(autoI18n.locales.map(l => [l.code, l]))
    // Cache frequently accessed values
    const defaultLocale = autoI18n.defaultLocale
    const hasDifferentDomains = !!autoI18n.differentDomains

    const validI18nUrlsForTransform: NormalizedI18n[] = []
    for (let i = 0; i < _urls.length; i++) {
      const _e = _urls[i]!
      if (_e._abs)
        continue
      const split = splitForLocales(_e._relativeLoc, localeCodes)
      let localeCode = split[0]
      const pathWithoutPrefix = split[1]
      if (!localeCode)
        localeCode = defaultLocale
      const e = _e as NormalizedI18n
      e._pathWithoutPrefix = pathWithoutPrefix
      // Use Map instead of find for O(1) lookup
      const locale = localeByCode.get(localeCode)
      if (!locale)
        continue
      e._locale = locale
      e._index = i
      e._key = `${e._sitemap || ''}${e._path?.pathname || '/'}${e._path?.search || ''}`
      withoutPrefixPaths[pathWithoutPrefix] = withoutPrefixPaths[pathWithoutPrefix] || []
      // need to make sure the locale doesn't already exist
      if (!withoutPrefixPaths[pathWithoutPrefix].some(e => e._locale.code === locale.code))
        withoutPrefixPaths[pathWithoutPrefix].push(e)
      validI18nUrlsForTransform.push(e)
    }

    for (const e of validI18nUrlsForTransform) {
      // let's try and find other urls that we can use for alternatives
      if (!e._i18nTransform && !e.alternatives?.length) {
        const alternatives: AlternativeEntry[] = []
        for (const u of withoutPrefixPaths[e._pathWithoutPrefix] || []) {
          if (u._locale.code === defaultLocale) {
            alternatives.push({
              href: u.loc,
              hreflang: 'x-default',
            })
          }
          alternatives.push({
            href: u.loc,
            hreflang: u._locale._hreflang || defaultLocale,
          })
        }
        if (alternatives.length)
          e.alternatives = alternatives
      }
      else if (e._i18nTransform) {
        delete e._i18nTransform
        const routeEntries = resolveI18nRouteEntries(e._relativeLoc, autoI18n.multiDomainLocales
          ? {
              ...autoI18n,
              multiDomainLocales: false,
              locales: autoI18n.locales.map(({ domain: _, domains: __, defaultForDomains: ___, ...locale }) => locale),
            }
          : autoI18n, href => !filterPath || filterPath(href))
        // keep single entry, just add alternatvies
        if (hasDifferentDomains) {
          e.alternatives = routeEntries[0]?.alternatives
        }
        else {
          // need to add urls for all other locales
          for (const { alternatives, locale: l, loc } of routeEntries) {
            const _sitemap = isI18nMapped ? l._sitemap : undefined
            const { _index: _, ...rest } = e
            const newEntry = preNormalizeEntry({
              _sitemap,
              ...rest,
              _key: `${_sitemap || ''}${loc || '/'}`,
              _locale: l,
              loc,
              alternatives,
            } as SitemapUrl, resolvers) as NormalizedI18n
            if (e._locale.code === newEntry._locale.code) {
              // replace
              _urls[e._index!] = newEntry
              // avoid getting re-replaced
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
