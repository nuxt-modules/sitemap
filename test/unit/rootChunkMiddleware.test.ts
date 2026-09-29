import { describe, expect, it } from 'vitest'
import { needsRootChunkMiddleware } from '../../src/utils-internal/nuxtSitemap'

describe('needsRootChunkMiddleware', () => {
  it('is off for the default prefix, even with chunks', () => {
    expect(needsRootChunkMiddleware({ sitemapsPathPrefix: '/__sitemap__/', sitemaps: { posts: { chunks: 100 } } })).toBe(false)
  })

  it('is on for a root prefix with a chunked sitemap', () => {
    expect(needsRootChunkMiddleware({ sitemapsPathPrefix: '/', sitemaps: { posts: { chunks: 100 } } })).toBe(true)
    expect(needsRootChunkMiddleware({ sitemapsPathPrefix: false, sitemaps: { posts: { chunks: true } } })).toBe(true)
  })

  it('is off for a root prefix without chunks', () => {
    expect(needsRootChunkMiddleware({ sitemapsPathPrefix: '/', sitemaps: { pages: { includeAppSources: true }, index: [] } })).toBe(false)
  })

  it('is off without named sitemaps', () => {
    expect(needsRootChunkMiddleware({ sitemapsPathPrefix: '/', sitemaps: true })).toBe(false)
    expect(needsRootChunkMiddleware({ sitemapsPathPrefix: '/', sitemaps: undefined })).toBe(false)
  })
})
