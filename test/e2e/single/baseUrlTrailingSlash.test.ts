import { describe, expect, it } from 'vitest'
import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../../fixtures/basic'),
  nuxtConfig: {
    app: {
      baseURL: '/subdir/',
    },
    site: {
      trailingSlash: true,
    },
  },
})
describe('base url trailing slash', () => {
  it('basic', async () => {
    const sitemap = await $fetch('/subdir/sitemap.xml')
    expect(sitemap).toMatchInlineSnapshot(`
      "<?xml version="1.0" encoding="UTF-8"?><?xml-stylesheet type="text/xsl" href="/subdir/__sitemap__/style.xsl"?>
      <urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd http://www.google.com/schemas/sitemap-image/1.1 http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd" xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
          <url>
              <loc>https://nuxtseo.com/subdir/</loc>
          </url>
          <url>
              <loc>https://nuxtseo.com/subdir/about/</loc>
          </url>
          <url>
              <loc>https://nuxtseo.com/subdir/crawled/</loc>
          </url>
          <url>
              <loc>https://nuxtseo.com/subdir/sub/page/</loc>
          </url>
      </urlset>"
    `)
  }, 60000)
})
