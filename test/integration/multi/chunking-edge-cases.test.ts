import { describe, expect, it } from 'vitest'
import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../../fixtures/multi-with-chunks'),
  server: true,
  nuxtConfig: {
    hooks: {
      'nitro:config': function (config) {
        config.runtimeConfig ??= {}
        config.runtimeConfig.public ??= {}
        config.runtimeConfig.public.siteUrl = 'https://nuxtseo.com'
      },
    },
  },
})

describe('chunking edge cases', () => {
  describe('empty chunks', () => {
    it('returns 404 for non-existent chunk', async () => {
      // The posts sitemap has 12 posts with chunkSize: 3, so it should have chunks 0-3
      // Chunk 4 should not exist
      try {
        await $fetch('/__sitemap__/posts-4.xml')
        throw new Error('Should have thrown 404')
      }
      catch (error: any) {
        expect(error.data?.statusCode || error.statusCode).toBe(404)
      }
    })

    it('returns 404 for chunk of non-chunked sitemap', async () => {
      // pages sitemap doesn't have chunking enabled
      try {
        await $fetch('/__sitemap__/pages-0.xml')
        throw new Error('Should have thrown 404')
      }
      catch (error: any) {
        expect(error.data?.statusCode || error.statusCode).toBe(404)
      }
    })
  })

  describe('chunk boundary validation', () => {
    it('handles last valid chunk', async () => {
      // posts has 12 items with chunkSize: 3, so chunk 3 (the 4th chunk) is the last valid one
      const chunk = await $fetch('/__sitemap__/posts-3.xml')
      expect(chunk).toContain('<urlset')
      expect(chunk).toContain('<loc>https://nuxtseo.com/posts/10</loc>')
      expect(chunk).toContain('<loc>https://nuxtseo.com/posts/11</loc>')
      expect(chunk).toContain('<loc>https://nuxtseo.com/posts/12</loc>')
    })

    it('handles products chunk boundaries', async () => {
      // products has 25 items with chunkSize: 10
      // chunk 0: 1-10, chunk 1: 11-20, chunk 2: 21-25

      const chunk2 = await $fetch('/__sitemap__/products-2.xml')
      expect(chunk2).toContain('<urlset')
      expect(chunk2).toContain('<loc>https://nuxtseo.com/products/21</loc>')
      expect(chunk2).toContain('<loc>https://nuxtseo.com/products/25</loc>')

      // chunk 3 should not exist
      try {
        await $fetch('/__sitemap__/products-3.xml')
        throw new Error('Should have thrown 404')
      }
      catch (error: any) {
        expect(error.data?.statusCode || error.statusCode).toBe(404)
      }
    })
  })
})
