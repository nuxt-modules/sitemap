import { describe, expect, it } from 'vitest'
import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../../fixtures/i18n'),
  nuxtConfig: {
    i18n: {
      strategy: 'prefix_except_default',
      locales: [
        { code: 'en', iso: 'en-US' },
        { code: 'fr', iso: 'fr-FR' },
      ],
    },
    sitemap: {
      excludeAppSources: true,
      sources: [
        '/i18n-urls',
      ],
    },
  },
})
describe('i18n dynamic urls', () => {
  it('basic', async () => {
    let sitemap = await $fetch('/__sitemap__/en-US.xml')

    // strip lastmod
    sitemap = sitemap.replace(/<lastmod>.*<\/lastmod>/g, '')

    expect(sitemap).toMatchInlineSnapshot(`
      "<?xml version="1.0" encoding="UTF-8"?><?xml-stylesheet type="text/xsl" href="/__sitemap__/style.xsl"?>
      <urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd http://www.google.com/schemas/sitemap-image/1.1 http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd" xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
          <url>
              <loc>https://nuxtseo.com/endless-dungeon</loc>
              <xhtml:link rel="alternate" hreflang="x-default" href="https://nuxtseo.com/endless-dungeon" />
              <xhtml:link rel="alternate" hreflang="en-US" href="https://nuxtseo.com/endless-dungeon" />
              <xhtml:link rel="alternate" hreflang="fr-FR" href="https://nuxtseo.com/fr/endless-dungeon" />
              <xhtml:link rel="alternate" hreflang="es-ES" href="https://nuxtseo.com/es/endless-dungeon" />
          </url>
          <url>
              <loc>https://nuxtseo.com/english-url</loc>
              <xhtml:link rel="alternate" href="https://nuxtseo.com/english-url" hreflang="x-default" />
              <xhtml:link rel="alternate" href="https://nuxtseo.com/english-url" hreflang="en" />
          </url>
          <url>
              <loc>https://nuxtseo.com/__sitemap/url</loc>
              <changefreq>weekly</changefreq>
              <xhtml:link rel="alternate" hreflang="x-default" href="https://nuxtseo.com/__sitemap/url" />
              <xhtml:link rel="alternate" hreflang="en-US" href="https://nuxtseo.com/__sitemap/url" />
              <xhtml:link rel="alternate" hreflang="fr-FR" href="https://nuxtseo.com/fr/__sitemap/url" />
              <xhtml:link rel="alternate" hreflang="es-ES" href="https://nuxtseo.com/es/__sitemap/url" />
          </url>
          <url>
              <loc>https://www.somedomain.com/abc/def</loc>
          </url>
          <url>
              <loc>https://nuxtseo.com/en/dynamic/foo</loc>
              <xhtml:link rel="alternate" href="https://nuxtseo.com/en/dynamic/foo" hreflang="x-default" />
              <xhtml:link rel="alternate" href="https://nuxtseo.com/en/dynamic/foo" hreflang="en" />
              <xhtml:link rel="alternate" href="https://nuxtseo.com/fr/dynamic/foo" hreflang="fr" />
          </url>
      </urlset>"
    `)
  }, 60000)
})
