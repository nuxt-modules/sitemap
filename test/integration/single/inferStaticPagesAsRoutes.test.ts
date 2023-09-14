import { describe, expect, it } from 'vitest'
import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../../fixtures/basic'),
  nuxtConfig: {
    routeRules: {
      '/': { swr: 600 },
      '/a/:id': { swr: 600 }, // This result is something I don’t want to show in the sitemap
      'b/:name': { swr: 500 },
    },
    sitemap: {
      inferStaticPagesAsRoutes: false,
      dynamicUrlsApiEndpoint: '/__sitemap',
    },
  },
})
describe('inferStaticPagesAsRoutes', () => {
  it('disabled', async () => {
    const posts = await $fetch('/sitemap.xml')

    expect(posts).toMatchInlineSnapshot(`
      "<?xml version=\\"1.0\\" encoding=\\"UTF-8\\"?><?xml-stylesheet type=\\"text/xsl\\" href=\\"/__sitemap__/style.xsl\\"?>
      <urlset xmlns:xsi=\\"http://www.w3.org/2001/XMLSchema-instance\\" xmlns:video=\\"http://www.google.com/schemas/sitemap-video/1.1\\" xmlns:xhtml=\\"http://www.w3.org/1999/xhtml\\" xmlns:image=\\"http://www.google.com/schemas/sitemap-image/1.1\\" xmlns:news=\\"http://www.google.com/schemas/sitemap-news/0.9\\" xsi:schemaLocation=\\"http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd http://www.google.com/schemas/sitemap-image/1.1 http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd\\" xmlns=\\"http://www.sitemaps.org/schemas/sitemap/0.9\\">
          <url>
              <loc>https://nuxtseo.com/</loc>
          </url>
          <url>
              <loc>https://nuxtseo.com/__sitemap/abs</loc>
          </url>
          <url>
              <loc>https://nuxtseo.com/__sitemap/loc</loc>
          </url>
          <url>
              <loc>https://nuxtseo.com/__sitemap/url</loc>
          </url>
      </urlset>"
    `)
  }, 60000)
})
