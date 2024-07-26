import { describe, expect, it } from 'vitest'
import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../../fixtures/i18n'),
  build: true,
  server: true,
  nuxtConfig: {
    i18n: {
      differentDomains: true,
      locales: [
        {
          code: 'en',
          iso: 'en-US',
          domain: 'nuxtseo.com',
        },
        {
          code: 'es',
          iso: 'es-ES',
          domain: 'es.nuxtseo.com',
        },
        {
          code: 'fr',
          iso: 'fr-FR',
          domain: 'fr.nuxtseo.com',
        },
      ],
    },
    sitemap: {
    },
  },
})
describe('i18n domains', () => {
  it('basic', async () => {
    const index = await $fetch('/sitemap.xml')

    expect(index).toMatchInlineSnapshot(`
      "<?xml version="1.0" encoding="UTF-8"?><?xml-stylesheet type="text/xsl" href="/__sitemap__/style.xsl"?>
      <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
          <sitemap>
              <loc>https://nuxtseo.com/__sitemap__/en-US.xml</loc>
          </sitemap>
          <sitemap>
              <loc>https://nuxtseo.com/__sitemap__/es-ES.xml</loc>
          </sitemap>
          <sitemap>
              <loc>https://nuxtseo.com/__sitemap__/fr-FR.xml</loc>
          </sitemap>
      </sitemapindex>"
    `)

    const fr = await $fetch('/__sitemap__/fr-FR.xml')
    expect(fr).toMatchInlineSnapshot(`
      "<?xml version="1.0" encoding="UTF-8"?><?xml-stylesheet type="text/xsl" href="/__sitemap__/style.xsl"?>
      <urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd http://www.google.com/schemas/sitemap-image/1.1 http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd" xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
          <url>
              <loc>https://fr.nuxtseo.com/fr/</loc>
              <xhtml:link rel="alternate" hreflang="en-US" href="https://nuxtseo.com/en" />
              <xhtml:link rel="alternate" hreflang="es-ES" href="https://es.nuxtseo.com/es" />
              <xhtml:link rel="alternate" hreflang="fr-FR" href="https://fr.nuxtseo.com/fr" />
              <xhtml:link rel="alternate" hreflang="x-default" href="https://nuxtseo.com/en" />
          </url>
          <url>
              <loc>https://fr.nuxtseo.com/fr/test/</loc>
              <xhtml:link rel="alternate" hreflang="en-US" href="https://nuxtseo.com/en/test" />
              <xhtml:link rel="alternate" hreflang="es-ES" href="https://es.nuxtseo.com/es/test" />
              <xhtml:link rel="alternate" hreflang="fr-FR" href="https://fr.nuxtseo.com/fr/test" />
              <xhtml:link rel="alternate" hreflang="x-default" href="https://nuxtseo.com/en/test" />
          </url>
      </urlset>"
    `)
  }, 60000)
})
