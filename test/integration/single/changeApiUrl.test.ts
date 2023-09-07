import { describe, expect, it } from 'vitest'
import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../../fixtures/basic'),
  nuxtConfig: {
    sitemap: {
      dynamicUrlsApiEndpoint: '/__sitemap',
    },
  },
})
describe('base', () => {
  it('basic', async () => {
    const posts = await $fetch('/__sitemap')

    expect(posts).toMatchInlineSnapshot(`
      [
        "/__sitemap/url",
        {
          "loc": "/__sitemap/loc",
        },
        {
          "loc": "https://nuxtseo.com/__sitemap/abs",
        },
      ]
    `)
  }, 60000)
})
