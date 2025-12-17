import { describe, expect, it } from 'vitest'
import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../../fixtures/issue-514'),
  server: true,
  nuxtConfig: {
    hooks: {
      'nitro:config': function (config) {
        config.runtimeConfig ??= {}
        config.runtimeConfig.public ??= {}
        config.runtimeConfig.public.siteUrl = 'https://example.com'
      },
    },
  },
})

describe('issue 514 - multi sitemap with chunks and / prefix', () => {
  it('sitemap index contains chunked sitemaps', async () => {
    const index = await $fetch('/sitemap_index.xml')

    expect(index).toContain('<sitemapindex')
    expect(index).toContain('<loc>https://example.com/pages.xml</loc>')
    // 15 urls with chunk size 10 = 2 chunks
    expect(index).toContain('<loc>https://example.com/dynamic-0.xml</loc>')
    expect(index).toContain('<loc>https://example.com/dynamic-1.xml</loc>')
  })

  it('pages sitemap works', async () => {
    const pages = await $fetch('/pages.xml')
    expect(pages).toContain('<urlset')
    expect(pages).toContain('<loc>https://example.com/</loc>')
  })

  it('dynamic chunk 0 works', async () => {
    const chunk = await $fetch('/dynamic-0.xml')
    expect(chunk).toContain('<urlset')
    expect(chunk).toContain('<loc>https://example.com/dynamic/1</loc>')
    expect(chunk).toContain('<loc>https://example.com/dynamic/10</loc>')
    expect(chunk).not.toContain('<loc>https://example.com/dynamic/11</loc>')
  })

  it('dynamic chunk 1 works', async () => {
    const chunk = await $fetch('/dynamic-1.xml')
    expect(chunk).toContain('<urlset')
    expect(chunk).toContain('<loc>https://example.com/dynamic/11</loc>')
    expect(chunk).toContain('<loc>https://example.com/dynamic/15</loc>')
    expect(chunk).not.toContain('<loc>https://example.com/dynamic/10</loc>')
  })

  it('non-existent chunk returns 404', async () => {
    try {
      await $fetch('/dynamic-2.xml')
      throw new Error('Should have thrown 404')
    }
    catch (error: any) {
      expect(error.data?.statusCode || error.statusCode).toBe(404)
    }
  })

  it('regular page routes still work', async () => {
    const about = await $fetch('/about')
    expect(about).toContain('About page')
  })
})
