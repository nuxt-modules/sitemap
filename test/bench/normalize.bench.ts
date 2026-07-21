import type { ResolvedSitemapUrl, SitemapSourceResolved } from '#sitemap'
import { bench, describe } from 'vitest'
import { normaliseEntry, preNormalizeEntry } from '../../src/runtime/server/sitemap/urlset/normalise'

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

const resolvedUrls: ResolvedSitemapUrl[] = Array.from({ length: 50_000 }, (_, i) => ({
  loc: `https://example.com/catalog/item-${i}`,
  lastmod: '2024-01-01',
  images: [{ loc: `https://example.com/images/item-${i}.jpg` }],
  _key: `/catalog/item-${i}`,
  _path: null,
}))

const uniqueLastmodUrls: ResolvedSitemapUrl[] = resolvedUrls.map((url, i) => ({
  ...url,
  lastmod: new Date(Date.UTC(2024, 0, 1, 0, 0, i)).toISOString(),
}))

describe('normalize', () => {
  bench('preNormalizeEntry', () => {
    const urls = sources.flatMap(s => s.urls)
    urls.map(u => preNormalizeEntry(u))
  }, {
    iterations: 1000,
  })

  bench('normaliseEntry - 50,000 urls with repeated lastmod', () => {
    const cache = {}
    resolvedUrls.map(url => normaliseEntry(url, undefined, undefined, cache))
  }, {
    iterations: 10,
  })

  bench('normaliseEntry - 50,000 urls with unique lastmod', () => {
    uniqueLastmodUrls.map(url => normaliseEntry(url))
  }, {
    iterations: 10,
  })
})
