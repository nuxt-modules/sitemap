import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../../fixtures/comark-content'),
})

describe('comark-content default', () => {
  it('serves collection urls on its own app source route', async () => {
    const urls = await $fetch('/__sitemap__/comark-content-urls.json')
    expect(urls).toMatchInlineSnapshot(`
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
  }, 60000)

  it('includes collection urls in the sitemap', async () => {
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

  it('names the source after comark, not @nuxt/content', async () => {
    const debug = await $fetch<{ globalSources: { context: { name: string } }[] }>('/__sitemap__/debug.json')
    const names = debug.globalSources.map(source => source.context.name)
    expect(names).toContain('@harlan-zw/comark-content:urls')
    expect(names).not.toContain('@nuxt/content@v3:urls')
  }, 60000)
})
