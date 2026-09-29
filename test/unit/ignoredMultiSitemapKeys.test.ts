import { describe, expect, it } from 'vitest'
import { resolveIgnoredMultiSitemapKeys } from '../../src/utils-internal/nuxtSitemap'

describe('resolveIgnoredMultiSitemapKeys', () => {
  it('flags top level sources when no sitemap includes app sources', () => {
    expect(resolveIgnoredMultiSitemapKeys({
      sources: ['/api/urls'],
      sitemaps: { posts: { sources: ['/api/posts'] } },
    })).toEqual(['sources'])
  })

  it('keeps top level sources when a sitemap includes app sources', () => {
    expect(resolveIgnoredMultiSitemapKeys({
      sources: ['/api/urls'],
      sitemaps: { pages: { includeAppSources: true }, posts: { sources: ['/api/posts'] } },
    })).toEqual([])
  })

  it('flags top level includeAppSources', () => {
    expect(resolveIgnoredMultiSitemapKeys({
      includeAppSources: true,
      sitemaps: { pages: { includeAppSources: true } },
    })).toEqual(['includeAppSources'])
  })

  it('flags nothing for a sitemap index only config', () => {
    expect(resolveIgnoredMultiSitemapKeys({
      sources: ['/api/urls'],
      sitemaps: { index: [{ sitemap: 'https://example.com/external.xml' }] },
    })).toEqual([])
  })

  it('flags nothing without a sitemaps object', () => {
    expect(resolveIgnoredMultiSitemapKeys({ sources: ['/api/urls'], sitemaps: true })).toEqual([])
  })
})
