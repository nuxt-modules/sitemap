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
      credits: false,
      trailingSlash: true,
      autoLastmod: false,
      siteUrl: 'https://nuxtseo.com',
    },
  },
})
describe('prod slash', () => {
  it('basic', async () => {
    const posts = await $fetch('/posts-sitemap.xml')
    // extract the URLs from loc using regex
    const postUrls = posts.match(/<loc>(.*?)<\/loc>/g)!.map(url => url.replace(/<\/?loc>/g, ''))
    postUrls.forEach((url) => {
      expect(url.endsWith('/')).toBeTruthy()
    })

    const pages = await $fetch('/posts-sitemap.xml')
    // extract the URLs from loc using regex
    const pageUrls = pages.match(/<loc>(.*?)<\/loc>/g)!.map(url => url.replace(/<\/?loc>/g, ''))
    pageUrls.forEach((url) => {
      expect(url.endsWith('/')).toBeTruthy()
    })
  }, 60000)
})
