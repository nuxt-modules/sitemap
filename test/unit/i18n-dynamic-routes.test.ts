import type { AutoI18nConfig } from '../../src/runtime/types'
import { describe, expect, it } from 'vitest'
import { resolveI18nRouteEntries } from '../../src/runtime/utils-pure'

const autoI18n = {
  defaultLocale: 'en',
  strategy: 'prefix_except_default',
  locales: [
    { code: 'en', _hreflang: 'en-US', _sitemap: 'en-US' },
    { code: 'fr', _hreflang: 'fr-FR', _sitemap: 'fr-FR' },
  ],
  pages: {
    product: {
      en: '/products/[category]/[id]',
      fr: '/produits/[id]/[category]',
    },
  },
} satisfies AutoI18nConfig

describe('i18n dynamic routes', () => {
  it('maps reordered dynamic parameters by name', () => {
    const entries = resolveI18nRouteEntries('/products/electronics/laptop-123', autoI18n)

    expect(entries.map(entry => ({
      loc: entry.loc,
      sitemap: entry.locale._sitemap,
      alternatives: entry.alternatives,
    }))).toEqual([
      {
        loc: '/products/electronics/laptop-123',
        sitemap: 'en-US',
        alternatives: [
          { href: '/products/electronics/laptop-123', hreflang: 'x-default' },
          { href: '/products/electronics/laptop-123', hreflang: 'en-US' },
          { href: '/fr/produits/laptop-123/electronics', hreflang: 'fr-FR' },
        ],
      },
      {
        loc: '/fr/produits/laptop-123/electronics',
        sitemap: 'fr-FR',
        alternatives: [
          { href: '/products/electronics/laptop-123', hreflang: 'x-default' },
          { href: '/products/electronics/laptop-123', hreflang: 'en-US' },
          { href: '/fr/produits/laptop-123/electronics', hreflang: 'fr-FR' },
        ],
      },
    ])
  })
})
