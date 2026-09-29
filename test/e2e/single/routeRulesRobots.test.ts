import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../../fixtures/basic'),
  nuxtConfig: {
    sitemap: {
      excludeAppSources: true,
      urls: ['/robots-false', '/robots-noindex', '/robots-none', '/robots-index'],
    },
    routeRules: {
      // @ts-expect-error untyped without @nuxtjs/robots
      '/robots-false': { robots: false },
      // @ts-expect-error untyped without @nuxtjs/robots
      '/robots-noindex': { robots: 'noindex, nofollow' },
      // @ts-expect-error untyped without @nuxtjs/robots
      '/robots-none': { robots: 'none' },
      // @ts-expect-error untyped without @nuxtjs/robots
      '/robots-index': { robots: 'index, nofollow' },
    },
  },
})

describe('route rule robots', () => {
  it('drops URLs whose robots route rule blocks indexing', async () => {
    const sitemap = await $fetch<string>('/sitemap.xml')
    expect(sitemap).not.toContain('/robots-false')
    expect(sitemap).not.toContain('/robots-noindex')
    expect(sitemap).not.toContain('/robots-none')
    expect(sitemap).toContain('<loc>https://nuxtseo.com/robots-index</loc>')
  }, 60000)
})
