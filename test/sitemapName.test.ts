import { describe, expect, it } from 'vitest'
import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../.playground'),
  build: true,
  server: true,
  nuxtConfig: {
    sitemap: {
      sitemaps: false,
      sitemapName: 'test.xml',
    },
  },
})
describe('sitemapName', () => {
  it('basic', async () => {
    const sitemap = await $fetch('/test.xml')
    expect(sitemap).toMatchInlineSnapshot(`
      "<?xml version=\\"1.0\\" encoding=\\"UTF-8\\"?><?xml-stylesheet type=\\"text/xsl\\" href=\\"/__sitemap__/style.xsl\\"?>
      <urlset xmlns:xsi=\\"http://www.w3.org/2001/XMLSchema-instance\\" xmlns:video=\\"http://www.google.com/schemas/sitemap-video/1.1\\" xmlns:xhtml=\\"http://www.w3.org/1999/xhtml\\" xmlns:image=\\"http://www.google.com/schemas/sitemap-image/1.1\\" xsi:schemaLocation=\\"http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd http://www.google.com/schemas/sitemap-image/1.1 http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd\\" xmlns=\\"http://www.sitemaps.org/schemas/sitemap/0.9\\">
          <url>
              <loc>https://example.com</loc>
              <lastmod>2023-06-17T02:15:08+00:00</lastmod>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://example.com/fr\\" />
          </url>
          <url>
              <loc>https://example.com/bar</loc>
              <lastmod>2023-04-28T18:08:42+00:00</lastmod>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://example.com/fr/bar\\" />
          </url>
          <url>
              <loc>https://example.com/foo</loc>
              <lastmod>2023-04-28T18:08:42+00:00</lastmod>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://example.com/fr/foo\\" />
          </url>
          <url>
              <loc>https://example.com/blog</loc>
              <lastmod>2023-04-28T18:08:42+00:00</lastmod>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://example.com/fr/blog\\" />
          </url>
          <url>
              <loc>https://example.com/about</loc>
              <lastmod>2023-02-20T21:50:52.000Z</lastmod>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://example.com/fr/about\\" />
              <changefreq>daily</changefreq>
              <priority>0.3</priority>
              <image:image>
                  <image:loc>https://example.com/image.jpg</image:loc>
              </image:image>
              <image:image>
                  <image:loc>https://example.com/image2.jpg</image:loc>
              </image:image>
          </url>
          <url>
              <loc>https://example.com/new-page</loc>
              <lastmod>2023-04-28T18:08:42+00:00</lastmod>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://example.com/fr/new-page\\" />
          </url>
          <url>
              <loc>https://example.com/blog/tags</loc>
              <lastmod>2023-04-28T18:08:42+00:00</lastmod>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://example.com/fr/blog/tags\\" />
          </url>
          <url>
              <loc>https://example.com/blog/post-1</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://example.com/fr/blog/post-1\\" />
          </url>
          <url>
              <loc>https://example.com/blog/post-2</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://example.com/fr/blog/post-2\\" />
          </url>
          <url>
              <loc>https://example.com/blog/post-3</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://example.com/fr/blog/post-3\\" />
          </url>
          <url>
              <loc>https://example.com/blog/post-4</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://example.com/fr/blog/post-4\\" />
          </url>
          <url>
              <loc>https://example.com/blog/post-5</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://example.com/fr/blog/post-5\\" />
          </url>
          <url>
              <loc>https://example.com/users-lazy/1</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://example.com/fr/users-lazy/1\\" />
          </url>
          <url>
              <loc>https://example.com/users-lazy/2</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://example.com/fr/users-lazy/2\\" />
          </url>
          <url>
              <loc>https://example.com/users-lazy/3</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://example.com/fr/users-lazy/3\\" />
          </url>
          <url>
              <loc>https://example.com/blog/tags/new</loc>
              <lastmod>2023-05-03T08:07:24+00:00</lastmod>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://example.com/fr/blog/tags/new\\" />
          </url>
          <url>
              <loc>https://example.com/blog/tags/edit</loc>
              <lastmod>2023-05-03T08:07:24+00:00</lastmod>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://example.com/fr/blog/tags/edit\\" />
          </url>
          <url>
              <loc>https://example.com/users-prerender</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://example.com/fr/users-prerender\\" />
          </url>
          <url>
              <loc>https://example.com/blog/categories</loc>
              <lastmod>2023-04-28T18:08:42+00:00</lastmod>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://example.com/fr/blog/categories\\" />
          </url>
          <url>
              <loc>https://example.com/hidden-path-but-in-sitemap</loc>
              <lastmod>2022-12-22T00:02:26+00:00</lastmod>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://example.com/fr/hidden-path-but-in-sitemap\\" />
          </url>
      </urlset>
      <!-- XML Sitemap generated by Nuxt Simple Sitemap -->"
    `)
  }, 60000)
})
