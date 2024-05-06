import { hasProtocol, joinURL, parseURL, withHttps, withLeadingSlash } from 'ufo'
import type {
  AlternativeEntry,
  ModuleRuntimeConfig,
  ResolvedSitemapUrl,
  SitemapSourceResolved,
  SitemapUrl,
} from '../../../types'
import { splitForLocales } from '../../../utils-pure'

export function normaliseI18nSources(sources: SitemapSourceResolved[], { autoI18n, isI18nMapped }: { autoI18n: ModuleRuntimeConfig['autoI18n'], isI18nMapped: boolean }) {
  if (autoI18n && isI18nMapped) {
    return sources.map((s) => {
      const urls = (s.urls || []).map((_url) => {
        const url = typeof _url === 'string' ? { loc: _url } : _url
        url.loc = url.loc || url.url!
        if (!hasProtocol(url.loc, { acceptRelative: true }))
          url.loc = withLeadingSlash(url.loc)

        return url
      })
      s.urls = urls.map((url) => {
        // only if the url wasn't already configured, excludes page, etc
        if (url._sitemap || url._i18nTransform)
          return url
        // if the url starts with a prefix, we should automatically bundle it to the correct sitemap using _sitemap
        if (url.loc && !hasProtocol(url.loc, { acceptRelative: true })) {
          const match = splitForLocales(url.loc, autoI18n.locales.map(l => l.code))
          const localeCode = match[0] || autoI18n.defaultLocale
          const pathWithoutPrefix = match[1]
          const locale = autoI18n.locales.find(e => e.code === localeCode)
          if (locale) {
            // let's try and find other urls that we can use for alternatives
            if (!url.alternatives) {
              const alternatives = urls
                .map((u) => {
                  // only if the url wasn't already configured, excludes page, etc
                  if (u._sitemap || u._i18nTransform)
                    return false
                  if (u?.loc) {
                    const [_localeCode, _pathWithoutPrefix] = splitForLocales(u.loc, autoI18n.locales.map(l => l.code))
                    if (pathWithoutPrefix === _pathWithoutPrefix) {
                      const entries: AlternativeEntry[] = []
                      if (_localeCode === autoI18n.defaultLocale) {
                        entries.push({
                          href: u.loc,
                          hreflang: 'x-default',
                        })
                      }
                      entries.push({
                        href: u.loc,
                        hreflang: _localeCode || autoI18n.defaultLocale,
                      })
                      return entries
                    }
                  }
                  return false
                })
                .flat()
                .filter(Boolean) as AlternativeEntry[]
              if (alternatives.length)
                url.alternatives = alternatives
            }
            return <SitemapUrl> {
              _sitemap: locale.iso || locale.code,
              ...url,
            }
          }
        }
        return url
      })
      return s
    })
  }
  return sources
}

export function applyI18nEnhancements(_urls: ResolvedSitemapUrl[], options: Pick<Required<ModuleRuntimeConfig>, 'autoI18n' | 'isI18nMapped'> & { sitemapName: string }): ResolvedSitemapUrl[] {
  const { autoI18n } = options
  // we won't remove any urls, only add and modify
  // for example an API returns ['/foo', '/bar'] but we want i18n integration
  return _urls
    .map((e) => {
      if (!e._i18nTransform)
        return e
      delete e._i18nTransform
      const parsedURL = parseURL(e.loc)
      const path = withLeadingSlash(parsedURL.pathname + parsedURL.search + parsedURL.hash)
      const match = splitForLocales(path, autoI18n.locales.map(l => l.code))
      let pathWithoutLocale = path
      let locale
      if (match[0]) {
        pathWithoutLocale = match[1] || '/'
        locale = match[0]
      }
      if (locale && import.meta.dev) {
        console.warn('You\'re providing a locale in the url, but the url is marked as inheritI18n. This will cause issues with the sitemap. Please remove the locale from the url.')
        return e
      }
      // keep single entry, just add alternatvies
      if (autoI18n.differentDomains) {
        return {
          // will force it to pass filter
          _sitemap: options.sitemapName,
          ...e,
          alternatives: [
            {
              // apply default locale domain
              ...autoI18n.locales.find(l => [l.code, l.iso].includes(autoI18n.defaultLocale)),
              code: 'x-default',
            },
            ...autoI18n.locales
              .filter(l => !!l.domain),
          ]
            .map((locale) => {
              return {
                hreflang: locale.iso || locale.code,
                href: joinURL(withHttps(locale.domain!), pathWithoutLocale),
              }
            }),
        }
      }
      // need to add urls for all other locales
      return autoI18n.locales
        .map((l) => {
          let loc = joinURL(`/${l.code}`, pathWithoutLocale)
          if (autoI18n.differentDomains || (['prefix_and_default', 'prefix_except_default'].includes(autoI18n.strategy) && l.code === autoI18n.defaultLocale))
            loc = pathWithoutLocale

          return {
            _sitemap: options.isI18nMapped ? (l.iso || l.code) : undefined,
            ...e,
            loc,
            alternatives: [{ code: 'x-default' }, ...autoI18n.locales].map((locale) => {
              const code = locale.code === 'x-default' ? autoI18n.defaultLocale : locale.code
              const isDefault = locale.code === 'x-default' || locale.code === autoI18n.defaultLocale
              let href = ''
              if (autoI18n.strategy === 'prefix') {
                href = joinURL('/', code, pathWithoutLocale)
              }
              else if (['prefix_and_default', 'prefix_except_default'].includes(autoI18n.strategy)) {
                if (isDefault) {
                  // no prefix
                  href = pathWithoutLocale
                }
                else {
                  href = joinURL('/', code, pathWithoutLocale)
                }
              }
              const hreflang = locale.iso || locale.code
              return {
                hreflang,
                href,
              }
            }),
          }
        })
    })
    .flat() as ResolvedSitemapUrl[]
}
