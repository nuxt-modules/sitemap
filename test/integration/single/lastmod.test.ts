import { describe, expect, it } from 'vitest'
import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../../fixtures/basic'),
  nuxtConfig: {
    sitemap: {
      urls: [
        {
          loc: '/foo',
          // valid but with milliseconds, should be removed
          lastmod: '2023-12-21T13:49:27.963745',
        },
        {
          loc: 'bar',
          lastmod: '2023-12-21', // valid - no timezone
        },
        {
          loc: 'baz',
          lastmod: '2023-12-21T13:49:27', // valid - timezone
        },
        {
          loc: 'qux',
          lastmod: '2023-12-21T13:49:27Z',
        },
        {
          loc: 'quux',
          lastmod: '2023 tuesday 3rd march', // very broken
        },
        {
          loc: '/issue/206',
          lastmod: '2023-12-21T22:46:58.441+00:00',
        },
      ],
    },
  },
})
describe('lastmod', () => {
  it('basic', async () => {
    const sitemap = await $fetch('/sitemap.xml')

    expect(sitemap).toMatchInlineSnapshot(`
      "<?xml version="1.0" encoding="UTF-8"?><?xml-stylesheet type="text/xsl" href="/__sitemap__/style.xsl"?>
      <urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd http://www.google.com/schemas/sitemap-image/1.1 http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd" xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
          <url>
              <loc>https://nuxtseo.com/</loc>
          </url>
          <url>
              <loc>https://nuxtseo.com/about</loc>
          </url>
          <url>
              <loc>https://nuxtseo.com/bar</loc>
              <lastmod>2023-12-21</lastmod>
          </url>
          <url>
              <loc>https://nuxtseo.com/baz</loc>
              <lastmod>2023-12-21T02:49:27+00:00</lastmod>
          </url>
          <url>
              <loc>https://nuxtseo.com/crawled</loc>
          </url>
          <url>
              <loc>https://nuxtseo.com/foo</loc>
              <lastmod>2023-12-21T02:49:27+00:00</lastmod>
          </url>
          <url>
              <loc>https://nuxtseo.com/quux</loc>
          </url>
          <url>
              <loc>https://nuxtseo.com/qux</loc>
              <lastmod>2023-12-21T02:49:27+00:00</lastmod>
          </url>
          <url>
              <loc>https://nuxtseo.com/issue/206</loc>
              <lastmod>2023-12-21T22:46:58.441+00:00</lastmod>
          </url>
          <url>
              <loc>https://nuxtseo.com/sub/page</loc>
          </url>
      </urlset>"
    `)
  }, 60000)
})
