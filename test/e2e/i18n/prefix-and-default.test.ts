import { describe, expect, it } from 'vitest'
import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'
import type { SitemapUrlInput } from '../../../src/runtime/types'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../../fixtures/i18n'),
  build: true,
  server: true,
  nuxtConfig: {
    i18n: {
      locales: [
        'en',
        'fr',
      ],
      strategy: 'prefix_and_default',
    },
    sitemap: {
      autoI18n: true,
      urls: [
        <SitemapUrlInput> {
          loc: '/extra',
          _i18nTransform: true,
        },
      ],
      sitemaps: false,
    },
  },
})
describe('i18n prefix and default', () => {
  it('basic', async () => {
    const posts = await $fetch('/sitemap.xml')

    expect(posts).toMatchInlineSnapshot(`
      "<?xml version="1.0" encoding="UTF-8"?><?xml-stylesheet type="text/xsl" href="/__sitemap__/style.xsl"?>
      <urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd http://www.google.com/schemas/sitemap-image/1.1 http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd" xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
          <url>
              <loc>https://nuxtseo.com/</loc>
              <xhtml:link rel="alternate" hreflang="en-US" href="https://nuxtseo.com/" />
              <xhtml:link rel="alternate" hreflang="es-ES" href="https://nuxtseo.com/es" />
              <xhtml:link rel="alternate" hreflang="fr-FR" href="https://nuxtseo.com/fr" />
              <xhtml:link rel="alternate" hreflang="x-default" href="https://nuxtseo.com/" />
          </url>
          <url>
              <loc>https://nuxtseo.com/es</loc>
              <xhtml:link rel="alternate" hreflang="en-US" href="https://nuxtseo.com/" />
              <xhtml:link rel="alternate" hreflang="es-ES" href="https://nuxtseo.com/es" />
              <xhtml:link rel="alternate" hreflang="fr-FR" href="https://nuxtseo.com/fr" />
              <xhtml:link rel="alternate" hreflang="x-default" href="https://nuxtseo.com/" />
          </url>
          <url>
              <loc>https://nuxtseo.com/extra</loc>
              <xhtml:link rel="alternate" hreflang="x-default" href="https://nuxtseo.com/extra" />
              <xhtml:link rel="alternate" hreflang="en-US" href="https://nuxtseo.com/extra" />
              <xhtml:link rel="alternate" hreflang="fr-FR" href="https://nuxtseo.com/fr/extra" />
              <xhtml:link rel="alternate" hreflang="es-ES" href="https://nuxtseo.com/es/extra" />
          </url>
          <url>
              <loc>https://nuxtseo.com/fr</loc>
              <xhtml:link rel="alternate" hreflang="en-US" href="https://nuxtseo.com/" />
              <xhtml:link rel="alternate" hreflang="es-ES" href="https://nuxtseo.com/es" />
              <xhtml:link rel="alternate" hreflang="fr-FR" href="https://nuxtseo.com/fr" />
              <xhtml:link rel="alternate" hreflang="x-default" href="https://nuxtseo.com/" />
          </url>
          <url>
              <loc>https://nuxtseo.com/no-i18n</loc>
              <xhtml:link rel="alternate" href="https://nuxtseo.com/no-i18n" hreflang="x-default" />
              <xhtml:link rel="alternate" href="https://nuxtseo.com/no-i18n" hreflang="en-US" />
          </url>
          <url>
              <loc>https://nuxtseo.com/test</loc>
              <xhtml:link rel="alternate" hreflang="en-US" href="https://nuxtseo.com/test" />
              <xhtml:link rel="alternate" hreflang="es-ES" href="https://nuxtseo.com/es/test" />
              <xhtml:link rel="alternate" hreflang="fr-FR" href="https://nuxtseo.com/fr/test" />
              <xhtml:link rel="alternate" hreflang="x-default" href="https://nuxtseo.com/test" />
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
              <loc>https://nuxtseo.com/es/extra</loc>
              <xhtml:link rel="alternate" hreflang="x-default" href="https://nuxtseo.com/extra" />
              <xhtml:link rel="alternate" hreflang="en-US" href="https://nuxtseo.com/extra" />
              <xhtml:link rel="alternate" hreflang="fr-FR" href="https://nuxtseo.com/fr/extra" />
              <xhtml:link rel="alternate" hreflang="es-ES" href="https://nuxtseo.com/es/extra" />
          </url>
          <url>
              <loc>https://nuxtseo.com/es/test</loc>
              <xhtml:link rel="alternate" hreflang="en-US" href="https://nuxtseo.com/test" />
              <xhtml:link rel="alternate" hreflang="es-ES" href="https://nuxtseo.com/es/test" />
              <xhtml:link rel="alternate" hreflang="fr-FR" href="https://nuxtseo.com/fr/test" />
              <xhtml:link rel="alternate" hreflang="x-default" href="https://nuxtseo.com/test" />
          </url>
          <url>
              <loc>https://nuxtseo.com/fr/extra</loc>
              <xhtml:link rel="alternate" hreflang="x-default" href="https://nuxtseo.com/extra" />
              <xhtml:link rel="alternate" hreflang="en-US" href="https://nuxtseo.com/extra" />
              <xhtml:link rel="alternate" hreflang="fr-FR" href="https://nuxtseo.com/fr/extra" />
              <xhtml:link rel="alternate" hreflang="es-ES" href="https://nuxtseo.com/es/extra" />
          </url>
          <url>
              <loc>https://nuxtseo.com/fr/test</loc>
              <xhtml:link rel="alternate" hreflang="en-US" href="https://nuxtseo.com/test" />
              <xhtml:link rel="alternate" hreflang="es-ES" href="https://nuxtseo.com/es/test" />
              <xhtml:link rel="alternate" hreflang="fr-FR" href="https://nuxtseo.com/fr/test" />
              <xhtml:link rel="alternate" hreflang="x-default" href="https://nuxtseo.com/test" />
          </url>
          <url>
              <loc>https://nuxtseo.com/es/__sitemap/url</loc>
              <changefreq>weekly</changefreq>
              <xhtml:link rel="alternate" hreflang="x-default" href="https://nuxtseo.com/__sitemap/url" />
              <xhtml:link rel="alternate" hreflang="en-US" href="https://nuxtseo.com/__sitemap/url" />
              <xhtml:link rel="alternate" hreflang="fr-FR" href="https://nuxtseo.com/fr/__sitemap/url" />
              <xhtml:link rel="alternate" hreflang="es-ES" href="https://nuxtseo.com/es/__sitemap/url" />
          </url>
          <url>
              <loc>https://nuxtseo.com/fr/__sitemap/url</loc>
              <changefreq>weekly</changefreq>
              <xhtml:link rel="alternate" hreflang="x-default" href="https://nuxtseo.com/__sitemap/url" />
              <xhtml:link rel="alternate" hreflang="en-US" href="https://nuxtseo.com/__sitemap/url" />
              <xhtml:link rel="alternate" hreflang="fr-FR" href="https://nuxtseo.com/fr/__sitemap/url" />
              <xhtml:link rel="alternate" hreflang="es-ES" href="https://nuxtseo.com/es/__sitemap/url" />
          </url>
      </urlset>"
    `)
  }, 60000)
})
