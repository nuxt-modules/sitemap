import { describe, expect, it } from 'vitest'
import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../.playground'),
  build: true,
  server: true,
  nuxtConfig: {
    app: {
      baseURL: '/base',
    },
    sitemap: {
      credits: false,
      autoLastmod: false,
      siteUrl: 'https://nuxtseo.com',
      dynamicUrlsApiEndpoint: '/__sitemap',
    },
  },
})
describe('base', () => {
  it('basic', async () => {
    const posts = await $fetch('/base/posts-sitemap.xml')

    // expect(posts).not.match(/\/base\/base\//g)
    expect(posts).toMatchInlineSnapshot(`
      "<?xml version=\\"1.0\\" encoding=\\"UTF-8\\"?><?xml-stylesheet type=\\"text/xsl\\" href=\\"/base/__sitemap__/style.xsl\\"?>
      <urlset xmlns:xsi=\\"http://www.w3.org/2001/XMLSchema-instance\\" xmlns:video=\\"http://www.google.com/schemas/sitemap-video/1.1\\" xmlns:xhtml=\\"http://www.w3.org/1999/xhtml\\" xmlns:image=\\"http://www.google.com/schemas/sitemap-image/1.1\\" xsi:schemaLocation=\\"http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd http://www.google.com/schemas/sitemap-image/1.1 http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd\\" xmlns=\\"http://www.sitemaps.org/schemas/sitemap/0.9\\">
          <url>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxtseo.com/base/fr/blog\\" />
              <loc>https://nuxtseo.com/base/blog</loc>
          </url>
          <url>
              <loc>https://nuxtseo.com/base/blog/1</loc>
          </url>
          <url>
              <loc>https://nuxtseo.com/base/blog/2</loc>
          </url>
          <url>
              <loc>https://nuxtseo.com/base/blog/3</loc>
          </url>
          <url>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxtseo.com/base/fr/blog/categories\\" />
              <loc>https://nuxtseo.com/base/blog/categories</loc>
          </url>
          <url>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxtseo.com/base/fr/blog/tags\\" />
              <loc>https://nuxtseo.com/base/blog/tags</loc>
          </url>
      </urlset>"
    `)
  }, 60000)
})
