import { describe, expect, it } from 'vitest'
import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../../fixtures/i18n'),
  server: true,
  nuxtConfig: {
    i18n: {
      locales: [
        {
          code: 'en',
          iso: 'en-US',
        },
        {
          code: 'es',
          iso: 'es-ES',
        },
        {
          code: 'fr',
          iso: 'fr-FR',
        },
      ],
      pages: {
        'about': {
          en: '/about',
          fr: '/a-propos',
        },
        'services/index': {
          en: '/services',
          fr: '/offres',
        },
        'services/development/index': {
          en: '/services/development',
          fr: '/offres/developement',
        },
        'services/development/app/index': {
          en: '/services/development/app',
          fr: '/offres/developement/app',
        },
        'services/development/website/index': {
          en: '/services/development/website',
          fr: '/offres/developement/site-web',
        },
        'services/coaching/index': {
          en: '/services/coaching',
          fr: '/offres/formation',
        },
        'random': {
          en: '/random',
          fr: false,
        },
      },
    },
  },
})
describe('i18n pages multi', () => {
  it('basic', async () => {
    const index = await $fetch('/sitemap_index.xml')
    expect(index).toMatchInlineSnapshot(`
      "<?xml version="1.0" encoding="UTF-8"?><?xml-stylesheet type="text/xsl" href="/__sitemap__/style.xsl"?>
      <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
          <sitemap>
              <loc>https://nuxtseo.com/sitemap/en-US.xml</loc>
          </sitemap>
          <sitemap>
              <loc>https://nuxtseo.com/sitemap/es-ES.xml</loc>
          </sitemap>
          <sitemap>
              <loc>https://nuxtseo.com/sitemap/fr-FR.xml</loc>
          </sitemap>
      </sitemapindex>"
    `)
    const fr = await $fetch('/sitemap/fr-FR.xml')
    expect(fr).toMatchInlineSnapshot()
  }, 60000)
})
