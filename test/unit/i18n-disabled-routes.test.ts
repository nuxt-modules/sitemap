import { expect, it } from 'vitest'
import { generatePathForI18nPages } from '../../src/util/i18n'

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

it('handles false values in generatePathForI18nPages', () => {
  // When false is passed, the function treats it as a path value
  // The fix in the module prevents false from reaching this function
  const result = generatePathForI18nPages({
    localeCode: 'en',
    pageLocales: false as any, // Intentionally passing wrong type
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

  // It returns false value as-is for no_prefix strategy
  expect(result).toBe(false)
})