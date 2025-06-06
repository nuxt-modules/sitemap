import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { buildNuxt, createResolver, loadNuxt } from '@nuxt/kit'

describe.skipIf(process.env.CI)('generate', () => {
  it('basic', async () => {
    process.env.NODE_ENV = 'production'
    // @ts-expect-error untyped
    process.env.prerender = true
    process.env.NITRO_PRESET = 'static'
    process.env.NUXT_PUBLIC_SITE_URL = 'https://nuxtseo.com'
    const { resolve } = createResolver(import.meta.url)
    const rootDir = resolve('../../fixtures/chunks')
    const nuxt = await loadNuxt({
      rootDir,
      overrides: {
        nitro: {
          preset: 'static',
        },
        _generate: true,
      },
    })

    await buildNuxt(nuxt)

    await new Promise(resolve => setTimeout(resolve, 1000))

    const sitemap = (await readFile(resolve(rootDir, '.output/public/sitemap_index.xml'), 'utf-8')).replace(/lastmod>(.*?)</g, 'lastmod><')
    // ignore lastmod entries
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
    const sitemapEn = (await readFile(resolve(rootDir, '.output/public/__sitemap__/0.xml'), 'utf-8')).replace(/lastmod>(.*?)</g, 'lastmod><')
    expect(sitemapEn).toMatchInlineSnapshot(`
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
  }, 1200000)
})
