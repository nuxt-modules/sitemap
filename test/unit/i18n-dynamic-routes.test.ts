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

  it('uses the route path for locales omitted from a page map', () => {
    const entries = resolveI18nRouteEntries('/about', {
      ...autoI18n,
      pages: {
        about: {
          fr: '/a-propos',
        },
      },
    })

    expect(entries.map(entry => entry.loc)).toEqual([
      '/about',
      '/fr/a-propos',
    ])
  })

  it('falls back to strategy paths for unmatched routes', () => {
    expect(resolveI18nRouteEntries('/contact', autoI18n).map(entry => entry.loc)).toEqual([
      '/contact',
      '/fr/contact',
    ])
  })

  it('preserves query strings in localized entries and alternatives', () => {
    const entries = resolveI18nRouteEntries('/products/electronics/laptop-123?preview=true', autoI18n)

    expect(entries.map(entry => entry.loc)).toEqual([
      '/products/electronics/laptop-123?preview=true',
      '/fr/produits/laptop-123/electronics?preview=true',
    ])
    expect(entries[0]?.alternatives).toContainEqual({
      href: '/fr/produits/laptop-123/electronics?preview=true',
      hreflang: 'fr-FR',
    })
  })
})
