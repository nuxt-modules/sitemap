import { describe, expect, it } from 'vitest'
import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../../fixtures/basic'),
  nuxtConfig: {
    site: {
      trailingSlash: true,
    },
  },
})
describe('trailing slashes', () => {
  it('basic', async () => {
    const sitemap = await $fetch('/sitemap.xml')
    // extract the URLs from loc using regex
    const sitempUrls = sitemap.match(/<loc>(.*?)<\/loc>/g)!.map(url => url.replace(/<\/?loc>/g, ''))
    sitempUrls.forEach((url) => {
      expect(url.endsWith('/')).toBeTruthy()
    })
  }, 60000)
})
