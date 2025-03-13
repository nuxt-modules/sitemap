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
      sitemaps: false,
      urls: [
        // simply matching
        '/hidden',
        '/defaults',
        '/wildcard/defaults/foo',
        '/wildcard/hidden/foo',
        // i18n matching, should inherit the top level rules (without the locale)
        '/fr/hidden',
        '/fr/defaults',
        '/fr/wildcard/defaults/foo',
        '/fr/wildcard/hidden/foo',
      ],
    },
    routeRules: {
      '/hidden': {
        // @ts-expect-error untyped
        robots: false,
      },
      '/defaults': {
        sitemap: {
          changefreq: 'daily',
          priority: 1,
        },
      },
      '/wildcard/defaults/**': {
        sitemap: {
          changefreq: 'daily',
          priority: 1,
        },
      },
      '/wildcard/hidden/**': {
        // @ts-expect-error untyped
        robots: false,
      },
    },
  },
})
describe('i18n route rules', () => {
  it('basic', async () => {
    let sitemap = await $fetch('/sitemap.xml')

    // strip lastmod
    sitemap = sitemap.replace(/<lastmod>.*<\/lastmod>/g, '')

    expect(sitemap).toMatchInlineSnapshot(`
      "<?xml version="1.0" encoding="UTF-8"?><?xml-stylesheet type="text/xsl" href="/__sitemap__/style.xsl"?>
      <urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd http://www.google.com/schemas/sitemap-image/1.1 http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd" xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
          <url>
              <changefreq>daily</changefreq>
              <priority>1</priority>
              <loc>https://nuxtseo.com/defaults</loc>
              <xhtml:link rel="alternate" href="https://nuxtseo.com/defaults" hreflang="x-default" />
              <xhtml:link rel="alternate" href="https://nuxtseo.com/defaults" hreflang="en-US" />
              <xhtml:link rel="alternate" href="https://nuxtseo.com/fr/defaults" hreflang="fr-FR" />
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
              <changefreq>daily</changefreq>
              <priority>1</priority>
              <loc>https://nuxtseo.com/fr/defaults</loc>
              <xhtml:link rel="alternate" href="https://nuxtseo.com/defaults" hreflang="x-default" />
              <xhtml:link rel="alternate" href="https://nuxtseo.com/defaults" hreflang="en-US" />
              <xhtml:link rel="alternate" href="https://nuxtseo.com/fr/defaults" hreflang="fr-FR" />
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
          <url>
              <changefreq>daily</changefreq>
              <priority>1</priority>
              <loc>https://nuxtseo.com/wildcard/defaults/foo</loc>
              <xhtml:link rel="alternate" href="https://nuxtseo.com/wildcard/defaults/foo" hreflang="x-default" />
              <xhtml:link rel="alternate" href="https://nuxtseo.com/wildcard/defaults/foo" hreflang="en-US" />
              <xhtml:link rel="alternate" href="https://nuxtseo.com/fr/wildcard/defaults/foo" hreflang="fr-FR" />
          </url>
          <url>
              <changefreq>daily</changefreq>
              <priority>1</priority>
              <loc>https://nuxtseo.com/fr/wildcard/defaults/foo</loc>
              <xhtml:link rel="alternate" href="https://nuxtseo.com/wildcard/defaults/foo" hreflang="x-default" />
              <xhtml:link rel="alternate" href="https://nuxtseo.com/wildcard/defaults/foo" hreflang="en-US" />
              <xhtml:link rel="alternate" href="https://nuxtseo.com/fr/wildcard/defaults/foo" hreflang="fr-FR" />
          </url>
      </urlset>"
    `)
  }, 60000)
})
