import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../../fixtures/basic'),
  nuxtConfig: {
    sitemap: {
      sources: ['/api/sitemap/cached'],
    },
  },
})

describe('defineSitemapEventHandler cache option', () => {
  it('serves URLs from a cached source handler', async () => {
    const sitemap = await $fetch<string>('/sitemap.xml')
    expect(sitemap).toContain('https://nuxtseo.com/cached-source/foo')
  }, 60000)
})
