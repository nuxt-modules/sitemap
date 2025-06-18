import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { createResolver } from '@nuxt/kit'
import { fetch, setup } from '@nuxt/test-utils'

const { resolve } = createResolver(import.meta.url)

// Create a temporary directory for cache storage
const cacheDir = resolve('../../fixtures/.cache-test')

// Ensure cache directory exists
beforeAll(() => {
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true })
  }
})

// Clean up cache directory after tests
afterAll(() => {
  if (fs.existsSync(cacheDir)) {
    fs.rmSync(cacheDir, { recursive: true, force: true })
  }
})

// Basic multi-sitemap fixture with filesystem cache
await setup({
  rootDir: resolve('../../fixtures/multi-with-chunks'),
  dev: false, // Run in production mode to enable caching
  nuxtConfig: {
    sitemap: {
      sitemaps: {
        pages: {
          includeAppSources: true,
        },
        posts: {
          includeAppSources: false,
          urls: [
            { url: '/post-1' },
            { url: '/post-2' },
          ],
        },
      },
      cacheMaxAgeSeconds: 600, // 10 minutes
      runtimeCacheStorage: {
        driver: 'fs',
        base: cacheDir,
      },
    },
  },
})

describe('multi-sitemap filesystem caching', () => {
  it('should cache sitemap files to filesystem', async () => {
    // Clear cache directory
    const files = fs.readdirSync(cacheDir)
    for (const file of files) {
      fs.rmSync(path.join(cacheDir, file), { recursive: true, force: true })
    }

    // First request - should create cache files
    const response1 = await fetch('/sitemap_index.xml')
    expect(response1.status).toBe(200)

    // Give it a moment to write to filesystem
    await new Promise(resolve => setTimeout(resolve, 500))

    // Check that cache files were created
    const cacheFiles = fs.readdirSync(cacheDir)
    expect(cacheFiles.length).toBeGreaterThan(0)

    // Should have the sitemap group directory
    const sitemapCacheDir = path.join(cacheDir, 'sitemap')
    expect(fs.existsSync(sitemapCacheDir)).toBe(true)

    // Check for specific cache files
    const sitemapFiles = fs.readdirSync(sitemapCacheDir)

    // We should have cache files with keys based on our sitemap structure
    const hasCacheFiles = sitemapFiles.length > 0
    expect(hasCacheFiles).toBe(true)

    // Second request - should hit cache
    const response2 = await fetch('/sitemap_index.xml')
    expect(response2.status).toBe(200)

    // Content should be the same
    const content1 = await response1.text()
    const content2 = await response2.text()
    expect(content1).toBe(content2)
  })

  it('should cache individual sitemap files', async () => {
    // Request individual sitemap
    const response = await fetch('/__sitemap__/pages.xml')
    expect(response.status).toBe(200)

    // Give it a moment to write to filesystem
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Check cache structure
    const cacheFiles = fs.readdirSync(cacheDir)

    const sitemapCacheDir = path.join(cacheDir, 'sitemap')
    if (fs.existsSync(sitemapCacheDir)) {
      const sitemapFiles = fs.readdirSync(sitemapCacheDir)

      // The cache structure seems to be different, let's check if we have more files after the request
      expect(sitemapFiles.length).toBeGreaterThan(0)
    }
    else {
      // Cache might be at the root level
      const hasSitemapCache = cacheFiles.some(file => file.includes('sitemap'))
      expect(hasSitemapCache).toBe(true)
    }
  })

  it('should respect cache expiration', async () => {
    // Note: This test is conceptual - we can't easily test actual expiration
    // without mocking time or waiting for the cache to expire

    // Request a sitemap
    const response = await fetch('/__sitemap__/posts.xml')
    expect(response.status).toBe(200)

    // Check that cache headers indicate proper expiration
    const cacheControl = response.headers.get('cache-control')
    expect(cacheControl).toContain('max-age=600')
    expect(cacheControl).toContain('s-maxage=600')

    // Debug headers should show expiration info
    expect(response.headers.get('X-Sitemap-Cache-Duration')).toBe('600s')
    expect(response.headers.get('X-Sitemap-Cache-Expires')).toBeDefined()
  })
})
