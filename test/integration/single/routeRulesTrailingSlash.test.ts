import { describe, expect, it } from 'vitest'
import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../../fixtures/basic'),
  nuxtConfig: {
    site: {
      trailingSlash: true,
    },
    sitemap: {
      excludeAppSources: true,
      urls: ['/hidden/', '/defaults/', '/wildcard/defaults/foo/', '/wildcard/hidden/foo/'],
    },
    routeRules: {
      '/hidden': {
        index: false,
      },
      '/hidden/': {
        index: false,
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
        index: false,
      },
    },
  },
})
describe('route rules', () => {
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
              <loc>https://nuxtseo.com/defaults/</loc>
          </url>
          <url>
              <changefreq>daily</changefreq>
              <priority>1</priority>
              <loc>https://nuxtseo.com/wildcard/defaults/foo/</loc>
          </url>
      </urlset>"
    `)
  }, 60000)
})
