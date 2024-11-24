import { bench, describe } from 'vitest'
import { resolveSitemapEntries } from '../../src/runtime/server/sitemap/builder/sitemap'
import type { SitemapSourceResolved } from '#sitemap'

const sources: SitemapSourceResolved[] = [
  {
    urls: Array.from({ length: 3000 }, (_, i) => ({
      loc: `/foo-${i}`,
    })),
    context: {
      name: 'foo',
    },
    sourceType: 'user',
  },
]

describe('i18n', () => {
  bench('normaliseI18nSources', () => {
    resolveSitemapEntries({
      sitemapName: 'sitemap.xml',
    }, sources, {
      autoI18n: {
        locales: [
          { code: 'en', iso: 'en' },
          { code: 'fr', iso: 'fr' },
          // add 22 more locales
          ...Array.from({ length: 22 }, (_, i) => ({
            code: `code-${i}`,
            iso: `iso-${i}`,
          })),
        ],
        strategy: 'prefix',
        defaultLocale: 'en',
      },
      isI18nMapped: true,
    })
  }, {
    iterations: 1000,
  })
})
