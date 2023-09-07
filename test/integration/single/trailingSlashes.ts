import { describe, expect, it } from 'vitest'
import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../../fixtures/basic'),
  nuxtConfig: {
    site: {
      site: 'https://nuxtseo.com',
      trailingSlash: true,
    },
    sitemap: {
      // test from endpoint as well
      dynamicUrlsApiEndpoint: '/__sitemap',
    },
  },
})
describe('trailing slashes', () => {
  it('basic', async () => {
    const sitemap = await $fetch('/sitemap.xml')
    // extract the URLs from loc using regex
    const sitemapUrls = sitemap.match(/<loc>(.*?)<\/loc>/g)!.map(url => url.replace(/<\/?loc>/g, ''))
    sitemapUrls.forEach((url) => {
      expect(url.endsWith('/')).toBeTruthy()
    })
  }, 60000)
})
