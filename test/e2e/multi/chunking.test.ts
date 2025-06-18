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

describe('multi sitemaps with chunking', () => {
  it('basic index', async () => {
    const index = await $fetch('/sitemap_index.xml')

    expect(index).toContain('<sitemapindex')
    expect(index).toContain('<loc>https://nuxtseo.com/__sitemap__/pages.xml</loc>')

    // Should have 4 chunks for posts (12 posts / 3 per chunk)
    expect(index).toContain('<loc>https://nuxtseo.com/__sitemap__/posts-0.xml</loc>')
    expect(index).toContain('<loc>https://nuxtseo.com/__sitemap__/posts-1.xml</loc>')
    expect(index).toContain('<loc>https://nuxtseo.com/__sitemap__/posts-2.xml</loc>')
    expect(index).toContain('<loc>https://nuxtseo.com/__sitemap__/posts-3.xml</loc>')

    // Should have 3 chunks for products (25 products / 10 per chunk)
    expect(index).toContain('<loc>https://nuxtseo.com/__sitemap__/products-0.xml</loc>')
    expect(index).toContain('<loc>https://nuxtseo.com/__sitemap__/products-1.xml</loc>')
    expect(index).toContain('<loc>https://nuxtseo.com/__sitemap__/products-2.xml</loc>')
  })

  // Debug test
  it('posts sources', async () => {
    const posts = await $fetch('/api/posts')
    expect(posts).toHaveLength(12)
    expect(posts[0]).toEqual({
      loc: '/posts/1',
      lastmod: expect.any(String),
    })
  })

  it('posts chunk 0', async () => {
    const chunk = await $fetch('/__sitemap__/posts-0.xml')

    expect(chunk).toContain('<urlset')
    expect(chunk).toContain('<loc>https://nuxtseo.com/posts/1</loc>')
    expect(chunk).toContain('<loc>https://nuxtseo.com/posts/2</loc>')
    expect(chunk).toContain('<loc>https://nuxtseo.com/posts/3</loc>')
    expect(chunk).not.toContain('<loc>https://nuxtseo.com/posts/4</loc>')
  })

  it('posts chunk 1', async () => {
    const chunk = await $fetch('/__sitemap__/posts-1.xml')

    expect(chunk).toContain('<urlset')
    expect(chunk).toContain('<loc>https://nuxtseo.com/posts/4</loc>')
    expect(chunk).toContain('<loc>https://nuxtseo.com/posts/5</loc>')
    expect(chunk).toContain('<loc>https://nuxtseo.com/posts/6</loc>')
    expect(chunk).not.toContain('<loc>https://nuxtseo.com/posts/3</loc>')
    expect(chunk).not.toContain('<loc>https://nuxtseo.com/posts/7</loc>')
  })

  it('posts chunk 3 (last)', async () => {
    const chunk = await $fetch('/__sitemap__/posts-3.xml')

    expect(chunk).toContain('<urlset')
    expect(chunk).toContain('<loc>https://nuxtseo.com/posts/10</loc>')
    expect(chunk).toContain('<loc>https://nuxtseo.com/posts/11</loc>')
    expect(chunk).toContain('<loc>https://nuxtseo.com/posts/12</loc>')
    expect(chunk).not.toContain('<loc>https://nuxtseo.com/posts/9</loc>')
  })

  it('products chunk 0', async () => {
    const chunk = await $fetch('/__sitemap__/products-0.xml')

    expect(chunk).toContain('<urlset')
    expect(chunk).toContain('<loc>https://nuxtseo.com/products/1</loc>')
    expect(chunk).toContain('<loc>https://nuxtseo.com/products/10</loc>')
    expect(chunk).not.toContain('<loc>https://nuxtseo.com/products/11</loc>')
  })

  it('products chunk 2 (last)', async () => {
    const chunk = await $fetch('/__sitemap__/products-2.xml')

    expect(chunk).toContain('<urlset')
    expect(chunk).toContain('<loc>https://nuxtseo.com/products/21</loc>')
    expect(chunk).toContain('<loc>https://nuxtseo.com/products/25</loc>')
    expect(chunk).not.toContain('<loc>https://nuxtseo.com/products/20</loc>')
  })

  it('non-chunked pages sitemap', async () => {
    const pages = await $fetch('/__sitemap__/pages.xml')

    expect(pages).toContain('<urlset')
    expect(pages).toContain('<loc>https://nuxtseo.com/page/1</loc>')
    expect(pages).toContain('<loc>https://nuxtseo.com/page/20</loc>')
  })

  it('404 for non-existent chunk', async () => {
    // Should return 404 for chunks that don't exist
    try {
      await $fetch('/__sitemap__/posts-4.xml')
      throw new Error('Should have thrown 404')
    }
    catch (error: any) {
      expect(error.data?.statusCode || error.statusCode).toBe(404)
    }
  })

  it('404 for non-existent chunked sitemap', async () => {
    // Should return 404 for sitemap that doesn't support chunking
    try {
      await $fetch('/__sitemap__/pages-0.xml')
      throw new Error('Should have thrown 404')
    }
    catch (error: any) {
      expect(error.data?.statusCode || error.statusCode).toBe(404)
    }
  })
})
