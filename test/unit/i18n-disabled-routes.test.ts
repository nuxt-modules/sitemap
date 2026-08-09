import { expect, it } from 'vitest'
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
