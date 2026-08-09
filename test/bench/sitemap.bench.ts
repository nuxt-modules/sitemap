import type { AutoI18nConfig, NitroUrlResolvers, SitemapDefinition, SitemapUrlInput } from '../../src/runtime/types'
import { bench, describe } from 'vitest'
import { resolveSitemapEntries } from '../../src/runtime/server/sitemap/builder/entries'
import { createPathFilter } from '../../src/runtime/utils-pure'

const resolvers: NitroUrlResolvers = {
  canonicalUrlResolver: (url: string) => `https://example.com${url}`,
  relativeBaseUrlResolver: (url: string) => url,
  fixSlashes: (url: string) => url,
}

const sitemap: SitemapDefinition = {
  sitemapName: 'default',
  include: undefined,
  exclude: undefined,
}

const locales = ['en', 'fr', 'de', 'es', 'it', 'pt', 'nl', 'pl', 'ru', 'ja'].map(code => ({
  code,
  language: code,
  _sitemap: code,
  _hreflang: code,
}))

const autoI18nPrefix: AutoI18nConfig = {
  locales,
  defaultLocale: 'en',
  strategy: 'prefix',
}

const autoI18nPrefixExceptDefault: AutoI18nConfig = {
  locales,
  defaultLocale: 'en',
  strategy: 'prefix_except_default',
}

// URLs with i18n prefixes (1000 urls across 10 locales)
const i18nUrls: SitemapUrlInput[] = locales.flatMap(locale =>
  Array.from({ length: 100 }, (_, i) => ({
    loc: `/${locale.code}/page-${i}`,
    lastmod: '2024-01-01',
  })),
)

// URLs that need _i18nTransform (each expands to 10 locale variants)
const transformUrls: SitemapUrlInput[] = Array.from({ length: 200 }, (_, i) => ({
  loc: `/page-${i}`,
  lastmod: '2024-01-01',
  _i18nTransform: true,
}))

// Simple URLs without i18n
const simpleUrls: SitemapUrlInput[] = Array.from({ length: 1000 }, (_, i) => ({
  loc: `/page-${i}`,
  lastmod: '2024-01-01',
}))

// Large URL set for filtering benchmarks
const largeUrls: SitemapUrlInput[] = Array.from({ length: 5000 }, (_, i) => ({
  loc: `/category-${i % 10}/product-${i}`,
  lastmod: '2024-01-01',
}))

// Mixed URLs with various features
const mixedUrls: SitemapUrlInput[] = Array.from({ length: 1000 }, (_, i) => ({
  loc: `/page-${i}?foo=bar`,
  lastmod: '2024-01-01',
  changefreq: 'weekly' as const,
  priority: 0.8,
}))

// Sitemap with string pattern filtering (glob-style)
const sitemapWithStringFilters: SitemapDefinition = {
  sitemapName: 'filtered',
  include: ['/category-0/**', '/category-1/**', '/category-2/**'],
  exclude: ['/category-*/product-0', '/category-*/product-1'],
}

// Sitemap with regex filtering
const sitemapWithRegexFilters: SitemapDefinition = {
  sitemapName: 'regex-filtered',
  include: [/^\/category-[0-2]\//, /^\/category-5\//],
  exclude: [/product-\d$/, /product-1\d$/],
}

// Sitemap with many filter rules (stress test)
const sitemapWithManyFilters: SitemapDefinition = {
  sitemapName: 'many-filters',
  include: Array.from({ length: 20 }, (_, i) => `/category-${i % 10}/**`),
  exclude: Array.from({ length: 10 }, (_, i) => `/category-*/product-${i}`),
}

describe('resolveSitemapEntries', () => {
  bench('1000 simple urls (no i18n)', () => {
    resolveSitemapEntries(sitemap, simpleUrls, { autoI18n: undefined, isI18nMapped: false }, resolvers)
  }, { iterations: 100 })

  bench('1000 mixed urls with query (no i18n)', () => {
    resolveSitemapEntries(sitemap, mixedUrls, { autoI18n: undefined, isI18nMapped: false }, resolvers)
  }, { iterations: 100 })

  bench('1000 i18n urls (prefix)', () => {
    resolveSitemapEntries(sitemap, i18nUrls, { autoI18n: autoI18nPrefix, isI18nMapped: false }, resolvers)
  }, { iterations: 50 })

  bench('1000 i18n urls (prefix_except_default)', () => {
    resolveSitemapEntries(sitemap, i18nUrls, { autoI18n: autoI18nPrefixExceptDefault, isI18nMapped: false }, resolvers)
  }, { iterations: 50 })

  bench('200 urls _i18nTransform (prefix)', () => {
    resolveSitemapEntries(sitemap, transformUrls, { autoI18n: autoI18nPrefix, isI18nMapped: false }, resolvers)
  }, { iterations: 20 })

  bench('200 urls _i18nTransform (prefix_except_default)', () => {
    resolveSitemapEntries(sitemap, transformUrls, { autoI18n: autoI18nPrefixExceptDefault, isI18nMapped: false }, resolvers)
  }, { iterations: 20 })
})

describe('createPathFilter performance', () => {
  bench('5000 urls with string pattern filters', () => {
    resolveSitemapEntries(sitemapWithStringFilters, largeUrls, { autoI18n: undefined, isI18nMapped: false }, resolvers)
  }, { iterations: 20 })

  bench('5000 urls with regex filters', () => {
    resolveSitemapEntries(sitemapWithRegexFilters, largeUrls, { autoI18n: undefined, isI18nMapped: false }, resolvers)
  }, { iterations: 20 })

  bench('5000 urls with many filter rules', () => {
    resolveSitemapEntries(sitemapWithManyFilters, largeUrls, { autoI18n: undefined, isI18nMapped: false }, resolvers)
  }, { iterations: 20 })

  bench('createPathFilter - isolated filter calls (1000x)', () => {
    const filter = createPathFilter({
      include: ['/category-0/**', '/category-1/**'],
      exclude: ['/category-*/product-0'],
    })
    for (let i = 0; i < 1000; i++) {
      filter(`/category-${i % 10}/product-${i}`)
    }
  }, { iterations: 100 })
})
