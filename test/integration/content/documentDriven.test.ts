import { describe, expect, it } from 'vitest'
import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../../fixtures/content'),
  content: {
    documentDriven: true,
  },
})
describe('nuxt/content documentDriven', () => {
  it('basic', async () => {
    const nuxtContentUrls = await $fetch('/__sitemap__/nuxt-content-urls.json')
    expect(nuxtContentUrls).toMatchInlineSnapshot(`
      [
        {
          "priority": 0.5,
        },
        {
          "lastmod": "2021-10-20T00:00:00.000Z",
          "loc": "/blog/posts/bar",
        },
        {
          "lastmod": "2021-10-20T00:00:00.000Z",
        },
      ]
    `)

    const sitemap = await $fetch('/sitemap.xml')
    expect(sitemap).toMatchInlineSnapshot(`
      "<?xml version=\\"1.0\\" encoding=\\"UTF-8\\"?><?xml-stylesheet type=\\"text/xsl\\" href=\\"/__sitemap__/style.xsl\\"?>
      <urlset xmlns:xsi=\\"http://www.w3.org/2001/XMLSchema-instance\\" xmlns:video=\\"http://www.google.com/schemas/sitemap-video/1.1\\" xmlns:xhtml=\\"http://www.w3.org/1999/xhtml\\" xmlns:image=\\"http://www.google.com/schemas/sitemap-image/1.1\\" xmlns:news=\\"http://www.google.com/schemas/sitemap-news/0.9\\" xsi:schemaLocation=\\"http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd http://www.google.com/schemas/sitemap-image/1.1 http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd\\" xmlns=\\"http://www.sitemaps.org/schemas/sitemap/0.9\\">
          <url>
              <priority>0.5</priority>
              <loc>https://nuxtseo.com/</loc>
              <lastmod>2021-10-20T00:00:00.000Z</lastmod>
          </url>
          <url>
              <loc>https://nuxtseo.com/blog/posts/bar</loc>
              <lastmod>2021-10-20T00:00:00.000Z</lastmod>
          </url>
      </urlset>"
    `)
  }, 60000)
})
