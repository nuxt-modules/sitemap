import { readFile } from 'node:fs/promises'
import { buildNuxt, createResolver, loadNuxt } from '@nuxt/kit'
import { setup } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../../fixtures/basic'),
  dev: true,
  nuxtConfig: {
    sitemap: {
      zeroRuntime: true,
    },
  },
})

describe('zeroRuntime', () => {
  describe.skipIf(process.env.CI)('prerender', () => {
    it('generates sitemap during prerender', async () => {
      const rootDir = resolve('../../fixtures/generate')
      const nuxt = await loadNuxt({
        rootDir,
        overrides: {
          sitemap: {
            zeroRuntime: true,
            autoLastmod: false,
            credits: false,
          },
        },
      })
      await buildNuxt(nuxt)

      const sitemap = (await readFile(resolve(rootDir, '.output/public/sitemap.xml'), 'utf-8')).replace(/lastmod>(.*?)</g, 'lastmod><')
      expect(sitemap).toMatchInlineSnapshot(`
        "<?xml version="1.0" encoding="UTF-8"?><?xml-stylesheet type="text/xsl" href="/__sitemap__/style.xsl"?>
        <urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd http://www.google.com/schemas/sitemap-image/1.1 http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd" xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
            <url>
                <loc>https://nuxtseo.com/</loc>
            </url>
            <url>
                <loc>https://nuxtseo.com/about</loc>
            </url>
            <url>
                <loc>https://nuxtseo.com/crawled</loc>
            </url>
            <url>
                <loc>https://nuxtseo.com/dynamic/crawled</loc>
            </url>
            <url>
                <loc>https://nuxtseo.com/sub/page</loc>
            </url>
        </urlset>"
      `)
      expect(sitemap).not.toContain('/noindex')
    }, 1200000)
  })
})
