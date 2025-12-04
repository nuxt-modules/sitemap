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
        {
          "loc": "/published",
        },
        {
          "changefreq": "weekly",
          "lastmod": "2025-05-14",
          "loc": "/test-json",
          "priority": 0.9,
        },
        {
          "changefreq": "monthly",
          "lastmod": "2025-05-13",
          "loc": "/test-yaml",
          "priority": 0.8,
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
              <lastmod>2021-10-20</lastmod>
              <changefreq>daily</changefreq>
              <priority>0.5</priority>
              <image:image>
                  <image:loc>https://raw.githubusercontent.com/harlan-zw/static/main/sponsors.svg</image:loc>
              </image:image>
          </url>
          <url>
              <loc>https://nuxtseo.com/foo</loc>
              <priority>0.5</priority>
          </url>
          <url>
              <loc>https://nuxtseo.com/published</loc>
          </url>
          <url>
              <loc>https://nuxtseo.com/test-json</loc>
              <lastmod>2025-05-14</lastmod>
              <changefreq>weekly</changefreq>
              <priority>0.9</priority>
          </url>
          <url>
              <loc>https://nuxtseo.com/test-yaml</loc>
              <lastmod>2025-05-13</lastmod>
              <changefreq>monthly</changefreq>
              <priority>0.8</priority>
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
