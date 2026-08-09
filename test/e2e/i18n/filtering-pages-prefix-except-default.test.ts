import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../../fixtures/i18n'),
  nuxtConfig: {
    i18n: {
      defaultLocale: 'en',
      locales: ['en', 'fr'],
      strategy: 'prefix_except_default',
      pages: {
        about: {
          en: '/about',
          fr: '/a-propos',
        },
        test: {
          en: '/test',
          fr: false,
        },
      },
    },
    sitemap: {
      exclude: ['/about', '/test'],
      sitemaps: false,
    },
  },
})

describe('i18n page filtering with prefix_except_default', () => {
  it('keeps default and translated page exclusions', async () => {
    const sitemap = await $fetch('/sitemap.xml')

    expect(sitemap).not.toContain('<loc>https://nuxtseo.com/about</loc>')
    expect(sitemap).not.toContain('<loc>https://nuxtseo.com/fr/a-propos</loc>')
    expect(sitemap).not.toContain('<loc>https://nuxtseo.com/test</loc>')
  })
})
