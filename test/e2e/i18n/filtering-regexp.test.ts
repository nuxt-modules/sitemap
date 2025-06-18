import { describe, expect, it } from 'vitest'
import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../../fixtures/i18n'),
  nuxtConfig: {
    sitemap: {
      exclude: [
        /.*test.*/g,
        /.no-i18n/,
        '/en/__sitemap/**',
        '/__sitemap/**',
        // exclude fr
        '/fr',
      ],
    },
  },
})
describe('i18n filtering with regexp', () => {
  it('basic', async () => {
    let sitemap = await $fetch('/__sitemap__/en-US.xml')

    // strip lastmod
    sitemap = sitemap.replace(/<lastmod>.*<\/lastmod>/g, '')

    expect(sitemap).toMatchInlineSnapshot(`
      "<?xml version="1.0" encoding="UTF-8"?><?xml-stylesheet type="text/xsl" href="/__sitemap__/style.xsl"?>
      <urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd http://www.google.com/schemas/sitemap-image/1.1 http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd" xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
          <url>
              <loc>https://nuxtseo.com/en</loc>
              <xhtml:link rel="alternate" hreflang="en-US" href="https://nuxtseo.com/en" />
              <xhtml:link rel="alternate" hreflang="es-ES" href="https://nuxtseo.com/es" />
              <xhtml:link rel="alternate" hreflang="x-default" href="https://nuxtseo.com/en" />
          </url>
      </urlset>"
    `)
  }, 60000)
})
