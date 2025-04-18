import { bench, describe } from 'vitest'
import { preNormalizeEntry } from '../../src/runtime/server/sitemap/urlset/normalise'
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

describe('normalize', () => {
  bench('preNormalizeEntry', () => {
    const urls = sources.flatMap(s => s.urls)
    urls.map(u => preNormalizeEntry(u))
  }, {
    iterations: 1000,
  })
})
