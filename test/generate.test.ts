import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { buildNuxt, createResolver, loadNuxt } from '@nuxt/kit'

describe('generate', () => {
  it('basic', async () => {
    process.env.NODE_ENV = 'production'
    process.env.prerender = true
    process.env.NUXT_PUBLIC_SITE_URL = 'https://nuxtseo.com'
    const { resolve } = createResolver(import.meta.url)
    const rootDir = resolve('../.playground')
    const nuxt = await loadNuxt({
      rootDir,
      overrides: {
        _generate: true,
        sitemap: {
          debug: true,
          credits: false,
          autoLastmod: false,
        },
      },
    })

    await buildNuxt(nuxt)

    await new Promise(resolve => setTimeout(resolve, 1000))

    const sitemap = (await readFile(resolve(rootDir, '.output/public/sitemap_index.xml'), 'utf-8')).replace(/lastmod>(.*?)</g, 'lastmod><')
    // ignore lastmod entries
    expect(sitemap).toMatchInlineSnapshot(`
      "<?xml version=\\"1.0\\" encoding=\\"UTF-8\\"?><?xml-stylesheet type=\\"text/xsl\\" href=\\"/__sitemap__/style.xsl\\"?>
      <sitemapindex xmlns=\\"http://www.sitemaps.org/schemas/sitemap/0.9\\">
          <sitemap>
              <loc>https://nuxtseo.com/posts-sitemap.xml</loc>
          </sitemap>
          <sitemap>
              <loc>https://nuxtseo.com/pages-sitemap.xml</loc>
              <lastmod></lastmod>
          </sitemap>
          <sitemap>
              <loc>https://www.odysseytraveller.com/sitemap-pages.xml</loc>
          </sitemap>
      </sitemapindex>"
    `)

    const pages = (await readFile(resolve(rootDir, '.output/public/pages-sitemap.xml'), 'utf-8')).replace(/lastmod>(.*?)</g, 'lastmod><')
    expect(pages).toMatchInlineSnapshot(`
      "<?xml version=\\"1.0\\" encoding=\\"UTF-8\\"?><?xml-stylesheet type=\\"text/xsl\\" href=\\"/__sitemap__/style.xsl\\"?>
      <urlset xmlns:xsi=\\"http://www.w3.org/2001/XMLSchema-instance\\" xmlns:video=\\"http://www.google.com/schemas/sitemap-video/1.1\\" xmlns:xhtml=\\"http://www.w3.org/1999/xhtml\\" xmlns:image=\\"http://www.google.com/schemas/sitemap-image/1.1\\" xsi:schemaLocation=\\"http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd http://www.google.com/schemas/sitemap-image/1.1 http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd\\" xmlns=\\"http://www.sitemaps.org/schemas/sitemap/0.9\\">
          <url>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxtseo.com/fr\\" />
              <loc>https://nuxtseo.com/</loc>
          </url>
          <url>
              <xhtml:link rel=\\"alternate\\" href=\\"https://nuxtseo.com/fr/about\\" hreflang=\\"fr\\" />
              <loc>https://nuxtseo.com/about</loc>
              <lastmod></lastmod>
              <changefreq>daily</changefreq>
              <priority>0.3</priority>
              <image:image>
                  <image:loc>https://example.com/image.jpg</image:loc>
              </image:image>
              <image:image>
                  <image:loc>https://example.com/image2.jpg</image:loc>
              </image:image>
              <image:image>
                  <image:loc>https://example.com/image-3.jpg</image:loc>
              </image:image>
          </url>
          <url>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxtseo.com/fr/blog\\" />
              <loc>https://nuxtseo.com/blog</loc>
          </url>
          <url>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxtseo.com/fr/hidden-path-but-in-sitemap\\" />
              <loc>https://nuxtseo.com/hidden-path-but-in-sitemap</loc>
          </url>
          <url>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxtseo.com/fr/new-page\\" />
              <loc>https://nuxtseo.com/new-page</loc>
          </url>
          <url>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxtseo.com/fr/blog/categories\\" />
              <loc>https://nuxtseo.com/blog/categories</loc>
          </url>
          <url>
              <loc>https://nuxtseo.com/blog/post-1</loc>
          </url>
          <url>
              <loc>https://nuxtseo.com/blog/post-2</loc>
          </url>
          <url>
              <loc>https://nuxtseo.com/blog/post-3</loc>
          </url>
          <url>
              <loc>https://nuxtseo.com/blog/post-4</loc>
          </url>
          <url>
              <loc>https://nuxtseo.com/blog/post-5</loc>
          </url>
          <url>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxtseo.com/fr/blog/tags\\" />
              <loc>https://nuxtseo.com/blog/tags</loc>
          </url>
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
              <loc>https://nuxtseo.com/users-lazy/1</loc>
          </url>
          <url>
              <loc>https://nuxtseo.com/users-lazy/2</loc>
          </url>
          <url>
              <loc>https://nuxtseo.com/users-lazy/3</loc>
          </url>
      </urlset>"
    `)
  }, 1200000)
})
