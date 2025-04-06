import { describe, expect, it } from 'vitest'
import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../../fixtures/content-v3'),
})
describe('nuxt/content v3 default', () => {
  it('basic', async () => {
    const nuxtContentUrls = await $fetch('/__sitemap__/nuxt-content-urls.json')
    expect(nuxtContentUrls).toMatchInlineSnapshot(`
      [
        {
          "changefreq": "daily",
          "images": [
            {
              "loc": "https://raw.githubusercontent.com/harlan-zw/static/main/sponsors.svg",
            },
          ],
          "lastmod": "2021-10-20",
          "loc": "/bar",
          "priority": 0.5,
        },
        {
          "loc": "/foo",
          "priority": 0.5,
        },
        {
          "lastmod": "2021-10-20",
          "loc": "/posts/bar",
        },
        {
          "lastmod": "2021-10-20",
          "loc": "/posts/fallback",
        },
        {
          "loc": "/posts/foo",
        },
      ]
    `)

    const sitemap = await $fetch('/sitemap.xml')
    expect(sitemap).toMatchInlineSnapshot(`
      "<?xml version="1.0" encoding="UTF-8"?><?xml-stylesheet type="text/xsl" href="/__sitemap__/style.xsl"?>
      <urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd http://www.google.com/schemas/sitemap-image/1.1 http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd" xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
          <url>
              <loc>https://nuxtseo.com/</loc>
          </url>
          <url>
              <loc>https://nuxtseo.com/bar</loc>
              <image:image>
                  <image:loc>https://raw.githubusercontent.com/harlan-zw/static/main/sponsors.svg</image:loc>
              </image:image>
              <lastmod>2021-10-20</lastmod>
              <priority>0.5</priority>
              <changefreq>daily</changefreq>
          </url>
          <url>
              <loc>https://nuxtseo.com/foo</loc>
              <priority>0.5</priority>
          </url>
          <url>
              <loc>https://nuxtseo.com/posts/bar</loc>
              <lastmod>2021-10-20</lastmod>
          </url>
          <url>
              <loc>https://nuxtseo.com/posts/fallback</loc>
              <lastmod>2021-10-20</lastmod>
          </url>
          <url>
              <loc>https://nuxtseo.com/posts/foo</loc>
          </url>
      </urlset>"
    `)
  }, 60000)
})
