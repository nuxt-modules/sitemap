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

function isGeneratedAlternative(alternative: AlternativeEntry): boolean {
  return alternative._i18nGenerated !== undefined && alternative._i18nGenerated === JSON.stringify([alternative.hreflang, alternative.href.toString()])
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
  const requestHost = autoI18n?.multiDomainLocales && resolvers ? parseURL(resolvers.canonicalUrlResolver('/')).host?.toLowerCase() : undefined
  const localeDomains = (locale: AutoI18nConfig['locales'][number]) => (locale.domains || (locale.domain ? [locale.domain] : []))
    .map(domain => parseURL(domain.includes('://') ? domain : `https://${domain}`).host?.toLowerCase())
  const knownHost = requestHost && autoI18n && autoI18n.locales.some(locale => localeDomains(locale).includes(requestHost))
  const availableLocales = autoI18n && autoI18n.locales.filter((locale) => {
    const domains = localeDomains(locale)
    return !autoI18n.multiDomainLocales || !knownHost || domains.includes(requestHost!)
  })
  const domainLocaleKeys = autoI18n?.multiDomainLocales ? autoI18n.locales.map(l => l._sitemap) : []
  // 1. normalise
  const _urls: ResolvedSitemapUrl[] = []
  const unavailableEntries = new Set<ResolvedSitemapUrl>()
  for (const _e of urls) {
    const e = preNormalizeEntry(_e, resolvers)
    if (autoI18n && domainLocaleCodes && !e._abs && !e._i18nTransform) {
      const prefix = splitForLocales(e._path?.pathname || '/', domainLocaleCodes)[0]
      const localeCode = prefix || autoI18n.defaultLocale
      const sitemapLocale = isI18nMapped && typeof e._sitemap === 'string' ? resolveI18nSitemapLocaleKey(e._sitemap, domainLocaleKeys) : null
      const locale = autoI18n.locales.find(l => l.code === localeCode)
      if (locale && availableLocales && !availableLocales.includes(locale))
        continue
      // Nuxt emits every domain's default route. Keep only this domain's valid variant.
      if (autoI18n.strategy === 'prefix_except_default' && prefix === autoI18n.defaultLocale)
        continue
      if (sitemapLocale && sitemapLocale !== locale?._sitemap)
        continue
      if (e.alternatives?.some(isGeneratedAlternative)) {
        const alternatives = e.alternatives.filter((alternative) => {
          if (!isGeneratedAlternative(alternative))
            return true
          if (alternative.hreflang === 'x-default')
            return false
          const alternateLocale = autoI18n.locales.find(l => l._hreflang === alternative.hreflang)
          if (!alternateLocale)
            return true
          if (availableLocales && !availableLocales.includes(alternateLocale))
            return false
          const alternatePrefix = splitForLocales(parseURL(alternative.href.toString()).pathname || '/', domainLocaleCodes)[0]
          if (['prefix_except_default', 'prefix_and_default'].includes(autoI18n.strategy) && alternatePrefix === autoI18n.defaultLocale)
            return false
          return (alternatePrefix || autoI18n.defaultLocale) === alternateLocale.code
        })
        const defaultHreflang = autoI18n.locales.find(l => l.code === autoI18n.defaultLocale)?._hreflang
        const defaultAlternative = alternatives.find(a => a.hreflang === defaultHreflang)
        e.alternatives = defaultAlternative && !alternatives.some(alternative => alternative.hreflang === 'x-default')
          ? [...alternatives, { ...defaultAlternative, hreflang: 'x-default' }]
          : alternatives
      }
    }
    // Transform seeds may use a prefix that no final URL keeps on this domain.
    const needsExpansion = e._i18nTransform && !e._abs && autoI18n && autoI18n.strategy !== 'no_prefix'
    if (e.loc && (needsExpansion || !filterPath || filterPath(e.loc, e._path?.pathname)))
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
      // Only actual routes can supply inferred alternatives, never transformation seeds.
      if (!e._i18nTransform && !withoutPrefixPaths[pathWithoutPrefix].some(e => e._locale.code === locale.code))
        withoutPrefixPaths[pathWithoutPrefix].push(e)
      validI18nUrlsForTransform.push(e)
    }

    for (const e of validI18nUrlsForTransform) {
      // let's try and find other urls that we can use for alternatives
      if (!e._i18nTransform && !e.alternatives?.length) {
        const alternatives: AlternativeEntry[] = []
        for (const u of withoutPrefixPaths[e._pathWithoutPrefix] || []) {
          if (autoI18n.multiDomainLocales && availableLocales && !availableLocales.includes(u._locale))
            continue
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
        let routeEntries = resolveI18nRouteEntries(e._relativeLoc, autoI18n.multiDomainLocales
          ? {
              ...autoI18n,
              multiDomainLocales: false,
              locales: autoI18n.locales.map(({ domain: _, domains: __, defaultForDomains: ___, ...locale }) => locale),
            }
          : autoI18n, href => !filterPath || filterPath(href))
        if (autoI18n.multiDomainLocales && availableLocales) {
          const availableCodes = new Set(availableLocales.map(locale => locale.code))
          const availableHreflangs = new Set(availableLocales.map(locale => locale._hreflang))
          routeEntries = routeEntries.filter(entry => availableCodes.has(entry.locale.code)).map(entry => ({
            ...entry,
            alternatives: entry.alternatives.filter(alternative => alternative.hreflang === 'x-default' || availableHreflangs.has(alternative.hreflang)),
          }))
          if (!routeEntries.length) {
            unavailableEntries.add(e)
            continue
          }
          if (autoI18n.strategy === 'prefix_and_default') {
            const defaultEntry = routeEntries.find(entry => entry.locale.code === defaultLocale)
            if (defaultEntry) {
              routeEntries.push({ ...defaultEntry, loc: `/${defaultLocale}${defaultEntry.loc === '/' ? '' : defaultEntry.loc}` })
            }
          }
        }
        // keep single entry, just add alternatvies
        if (hasDifferentDomains) {
          e.alternatives = routeEntries[0]?.alternatives
        }
        else {
          // A source locale may be unavailable on this domain. Replace its seed with a valid entry.
          const sourceLocaleAvailable = routeEntries.some(entry => entry.locale.code === e._locale.code)
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
            if (e._index !== undefined && (e._locale.code === newEntry._locale.code || !sourceLocaleAvailable)) {
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
  return _urls.filter(entry => !unavailableEntries.has(entry) && (!filterPath || filterPath(entry.loc, entry._path?.pathname)))
}
