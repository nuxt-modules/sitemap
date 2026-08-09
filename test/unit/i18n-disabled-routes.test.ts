import { expect, it } from 'vitest'
import { resolveI18nRouteEntries } from '../../src/runtime/utils-pure'
import { generatePathForI18nPages, mapPathForI18nPages } from '../../src/utils-internal/i18n'

it('should handle string paths for generatePathForI18nPages', () => {
  const result = generatePathForI18nPages({
    localeCode: 'en',
    pageLocales: '/about',
    nuxtI18nConfig: {
      locales: ['en', 'fr'],
      defaultLocale: 'en',
      strategy: 'no_prefix',
    },
    normalisedLocales: [
      { code: 'en', _hreflang: 'en-US', _sitemap: 'en' },
      { code: 'fr', _hreflang: 'fr-FR', _sitemap: 'fr' },
    ],
  })

  expect(result).toBe('/about')
})

it('excludes disabled locale paths from mapped filters', () => {
  expect(mapPathForI18nPages('/about', {
    defaultLocale: 'en',
    strategy: 'no_prefix',
    locales: [
      { code: 'en', _hreflang: 'en-US', _sitemap: 'en' },
      { code: 'fr', _hreflang: 'fr-FR', _sitemap: 'fr' },
    ],
    pages: {
      about: { en: '/about', fr: false },
    },
  })).toEqual(['/about'])
})

it('excludes disabled locales from runtime route entries', () => {
  const entries = resolveI18nRouteEntries('/about', {
    defaultLocale: 'en',
    strategy: 'prefix_except_default',
    locales: [
      { code: 'en', _hreflang: 'en-US', _sitemap: 'en' },
      { code: 'fr', _hreflang: 'fr-FR', _sitemap: 'fr' },
    ],
    pages: {
      about: { en: '/about', fr: false },
    },
  })

  expect(entries.map(entry => entry.loc)).toEqual(['/about'])
  expect(entries[0]?.alternatives).toEqual([
    { href: '/about', hreflang: 'x-default' },
    { href: '/about', hreflang: 'en-US' },
  ])
})
