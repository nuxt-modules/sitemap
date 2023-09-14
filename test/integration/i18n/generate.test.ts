import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { buildNuxt, createResolver, loadNuxt } from '@nuxt/kit'

describe('generate', () => {
  it('basic', async () => {
    process.env.NODE_ENV = 'production'
    process.env.prerender = true
    process.env.NUXT_PUBLIC_SITE_URL = 'https://nuxtseo.com'
    const { resolve } = createResolver(import.meta.url)
    const rootDir = resolve('../../fixtures/i18n')
    const nuxt = await loadNuxt({
      rootDir,
      overrides: {
        _generate: true,
        nitro: { static: true },
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
              <loc>https://nuxtseo.com/en-sitemap.xml</loc>
          </sitemap>
          <sitemap>
              <loc>https://nuxtseo.com/fr-sitemap.xml</loc>
          </sitemap>
      </sitemapindex>"
    `)
    const sitemapEn = (await readFile(resolve(rootDir, '.output/public/en-sitemap.xml'), 'utf-8')).replace(/lastmod>(.*?)</g, 'lastmod><')
    expect(sitemapEn).toMatchInlineSnapshot(`
      "<?xml version=\\"1.0\\" encoding=\\"UTF-8\\"?><?xml-stylesheet type=\\"text/xsl\\" href=\\"/__sitemap__/style.xsl\\"?>
      <urlset xmlns:xsi=\\"http://www.w3.org/2001/XMLSchema-instance\\" xmlns:video=\\"http://www.google.com/schemas/sitemap-video/1.1\\" xmlns:xhtml=\\"http://www.w3.org/1999/xhtml\\" xmlns:image=\\"http://www.google.com/schemas/sitemap-image/1.1\\" xmlns:news=\\"http://www.google.com/schemas/sitemap-news/0.9\\" xsi:schemaLocation=\\"http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd http://www.google.com/schemas/sitemap-image/1.1 http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd\\" xmlns=\\"http://www.sitemaps.org/schemas/sitemap/0.9\\">
          <url>
              <loc>https://nuxtseo.com/en</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"en\\" href=\\"https://nuxtseo.com/en\\" />
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxtseo.com/fr\\" />
              <xhtml:link rel=\\"alternate\\" hreflang=\\"x-default\\" href=\\"https://nuxtseo.com/en\\" />
          </url>
          <url>
              <loc>https://nuxtseo.com/en/test</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"en\\" href=\\"https://nuxtseo.com/en/test\\" />
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxtseo.com/fr/test\\" />
              <xhtml:link rel=\\"alternate\\" hreflang=\\"x-default\\" href=\\"https://nuxtseo.com/en/test\\" />
          </url>
          <url>
              <loc>https://nuxtseo.com/en/__sitemap/url</loc>
              <changefreq>weekly</changefreq>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"en\\" href=\\"https://nuxtseo.com/en/__sitemap/url\\" />
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxtseo.com/fr/__sitemap/url\\" />
              <xhtml:link rel=\\"alternate\\" hreflang=\\"x-default\\" href=\\"https://nuxtseo.com/en/__sitemap/url\\" />
          </url>
      </urlset>"
    `)
  }, 1200000)
})
