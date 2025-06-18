import { describe, expect, it } from 'vitest'
import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../../fixtures/chunks'),
})
describe.skipIf(process.env.CI)('multi chunks', () => {
  it('basic', async () => {
    let sitemap = await $fetch('/sitemap_index.xml')
    // remove lastmods before tresting
    sitemap = sitemap.replace(/lastmod>(.*?)</g, 'lastmod><')
    // basic test to make sure we get a valid response
    expect(sitemap).toMatchInlineSnapshot(`
      "<?xml version="1.0" encoding="UTF-8"?>
      <?xml-stylesheet type="text/xsl" href="/__sitemap__/style.xsl"?>
      <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
          <sitemap>
              <loc>https://nuxtseo.com/__sitemap__/0.xml</loc>
          </sitemap>
          <sitemap>
              <loc>https://nuxtseo.com/__sitemap__/1.xml</loc>
          </sitemap>
          <sitemap>
              <loc>https://nuxtseo.com/__sitemap__/2.xml</loc>
          </sitemap>
          <sitemap>
              <loc>https://nuxtseo.com/__sitemap__/3.xml</loc>
          </sitemap>
      </sitemapindex>"
    `)
    const sitemap0 = await $fetch('/__sitemap__/0.xml')
    expect(sitemap0).toMatchInlineSnapshot(`
      "<?xml version="1.0" encoding="UTF-8"?><?xml-stylesheet type="text/xsl" href="/__sitemap__/style.xsl"?>
      <urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd http://www.google.com/schemas/sitemap-image/1.1 http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd" xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
          <url>
              <loc>https://nuxtseo.com/foo/1</loc>
          </url>
          <url>
              <loc>https://nuxtseo.com/foo/2</loc>
          </url>
          <url>
              <loc>https://nuxtseo.com/foo/3</loc>
          </url>
          <url>
              <loc>https://nuxtseo.com/foo/4</loc>
          </url>
          <url>
              <loc>https://nuxtseo.com/foo/5</loc>
          </url>
      </urlset>"
    `)
  }, 60000)
})
