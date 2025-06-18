import { describe, expect, it } from 'vitest'
import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../../fixtures/basic'),
  nuxtConfig: {
    sitemap: {
      sitemaps: {
        foo: {
          sources: ['/api/sitemap/foo'],
          defaults: {
            changefreq: 'weekly',
            priority: 0.7,
          },
        },
        bar: {
          sources: ['/api/sitemap/bar'],
        },
      },
    },
  },
})
describe('multi endpoints', () => {
  it('basic', async () => {
    let sitemap = await $fetch('/__sitemap__/foo.xml')
    // remove lastmods before tresting
    sitemap = sitemap.replace(/lastmod>(.*?)</g, 'lastmod><')
    // basic test to make sure we get a valid response
    expect(sitemap).toMatchInlineSnapshot(`
      "<?xml version="1.0" encoding="UTF-8"?><?xml-stylesheet type="text/xsl" href="/__sitemap__/style.xsl"?>
      <urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd http://www.google.com/schemas/sitemap-image/1.1 http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd" xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
          <url>
              <loc>https://nuxtseo.com/foo/1</loc>
              <changefreq>weekly</changefreq>
              <priority>0.7</priority>
          </url>
          <url>
              <loc>https://nuxtseo.com/foo/2</loc>
              <changefreq>weekly</changefreq>
              <priority>0.7</priority>
          </url>
          <url>
              <loc>https://nuxtseo.com/foo/3</loc>
              <changefreq>weekly</changefreq>
              <priority>0.7</priority>
          </url>
          <url>
              <loc>https://nuxtseo.com/foo/4</loc>
              <changefreq>weekly</changefreq>
              <priority>0.7</priority>
          </url>
          <url>
              <loc>https://nuxtseo.com/foo/5</loc>
              <changefreq>weekly</changefreq>
              <priority>0.7</priority>
          </url>
      </urlset>"
    `)
  }, 60000)
})
