import { describe, expect, it } from 'vitest'
import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../../fixtures/basic'),
  nuxtConfig: {
    sitemap: {
      xsl: false,
    },
  },
})
describe('xsl false', () => {
  it('basic', async () => {
    let sitemap = await $fetch('/sitemap.xml')

    // strip lastmod
    sitemap = sitemap.replace(/<lastmod>.*<\/lastmod>/g, '')

    expect(sitemap).toMatchInlineSnapshot(`
      "<?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd http://www.google.com/schemas/sitemap-image/1.1 http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd" xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
          <url>
              <loc>https://nuxtseo.com/</loc>
          </url>
          <url>
              <loc>https://nuxtseo.com/about</loc>
          </url>
          <url>
              <loc>https://nuxtseo.com/crawled</loc>
          </url>
          <url>
              <loc>https://nuxtseo.com/sub/page</loc>
          </url>
      </urlset>"
    `)
  }, 60000)
})
