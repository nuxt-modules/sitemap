import { describe, expect, it } from 'vitest'
import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../.playground'),
  build: true,
  server: true,
  nuxtConfig: {
    sitemap: {
      sitemaps: false,
      sitemapName: 'test.xml',
    },
  },
})
describe('sitemapName', () => {
  it('basic', async () => {
    const sitemap = await $fetch('/test.xml')
    // basic test to make sure we get a valid response
    expect(sitemap).toContain('<loc>https://example.com</loc>')
  }, 60000)
})
