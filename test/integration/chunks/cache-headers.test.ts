import { describe, expect, it } from 'vitest'
import { createResolver } from '@nuxt/kit'
import { fetch, setup } from '@nuxt/test-utils'

const { resolve } = createResolver(import.meta.url)

// Set up chunked sitemaps
await setup({
  rootDir: resolve('../../fixtures/chunks'),
  nuxtConfig: {
    sitemap: {
      // Global automatic chunking
      chunks: true,
      defaultSitemapsChunkSize: 100,
      cacheMaxAgeSeconds: 900, // 15 minutes
      runtimeCacheStorage: {
        driver: 'memory', // Use memory driver to avoid Redis connection issues
      },
    },
  },
})

describe('chunked sitemap caching with headers', () => {
  it('should return proper cache headers for sitemap index', async () => {
    const response = await fetch('/sitemap_index.xml')

    expect(response.headers.get('content-type')).toMatch(/xml/)

    // Check cache headers
    const cacheControl = response.headers.get('cache-control')
    expect(cacheControl).toBeDefined()
    expect(cacheControl).toContain('max-age=900')
    expect(cacheControl).toContain('s-maxage=900')
    expect(cacheControl).toContain('public')
    expect(cacheControl).toContain('stale-while-revalidate')

    // Check debug headers
    expect(response.headers.get('X-Sitemap-Generated')).toBeDefined()
    expect(response.headers.get('X-Sitemap-Cache-Duration')).toBe('900s')
    expect(response.headers.get('X-Sitemap-Cache-Expires')).toBeDefined()
    expect(response.headers.get('X-Sitemap-Cache-Remaining')).toBeDefined()

    const xml = await response.text()
    expect(xml).toContain('<sitemapindex')
    expect(xml).toContain('<sitemap>')
    expect(xml).toContain('<loc>')
  }, 10000)

  it('should return proper cache headers for first chunk', async () => {
    const response = await fetch('/__sitemap__/0.xml')

    expect(response.headers.get('content-type')).toMatch(/xml/)

    // Check cache headers
    const cacheControl = response.headers.get('cache-control')
    expect(cacheControl).toBeDefined()
    expect(cacheControl).toContain('max-age=900')
    expect(cacheControl).toContain('s-maxage=900')
    expect(cacheControl).toContain('public')
    expect(cacheControl).toContain('stale-while-revalidate')

    // Check debug headers
    expect(response.headers.get('X-Sitemap-Generated')).toBeDefined()
    expect(response.headers.get('X-Sitemap-Cache-Duration')).toBe('900s')
    expect(response.headers.get('X-Sitemap-Cache-Expires')).toBeDefined()
    expect(response.headers.get('X-Sitemap-Cache-Remaining')).toBeDefined()
  })

  it('should properly generate chunked sitemaps in index', async () => {
    const response = await fetch('/sitemap_index.xml')

    const xml = await response.text()
    expect(xml).toContain('<sitemapindex')
    expect(xml).toContain('/__sitemap__/0.xml')
  }, 10000)
})
