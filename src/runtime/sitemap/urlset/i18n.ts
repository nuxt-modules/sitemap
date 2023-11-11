import { joinURL, parseURL, withHttps } from 'ufo'
import type {
  ModuleRuntimeConfig,
  ResolvedSitemapUrl,
} from '../../types'

export function applyI18nEnhancements(_urls: ResolvedSitemapUrl[], options: Pick<Required<ModuleRuntimeConfig>, 'autoI18n' | 'isI18nMapped'> & { sitemapName: string }): ResolvedSitemapUrl[] {
  const { autoI18n } = options
  // we won't remove any urls, only add and modify
  // for example an API returns ['/foo', '/bar'] but we want i18n integration
  return _urls
    .map((e) => {
      if (!e._i18nTransform)
        return e
      delete e._i18nTransform
      const path = parseURL(e.loc).pathname
      const match = path.match(new RegExp(`^/(${autoI18n.locales.map(l => l.code).join('|')})(.*)`))
      let pathWithoutLocale = path
      let locale
      if (match) {
        pathWithoutLocale = match[2] || '/'
        locale = match[1]
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
          if (autoI18n.differentDomains || (autoI18n.strategy === 'prefix_except_default' && l.code === autoI18n.defaultLocale))
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
              else if (autoI18n.strategy === 'prefix_except_default') {
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
