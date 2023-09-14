import { describe, expect, it } from 'vitest'
import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../../fixtures/i18n'),
  build: true,
  server: true,
  nuxtConfig: {
    i18n: {
      locales: [
        {
          code: 'fr',
          iso: 'fr-FR',
        },
        {
          code: 'en',
          iso: 'en-US',
        },
      ],
      strategy: 'prefix',
    },
    sitemap: {
      autoI18n: true,
      urls: ['/extra'],
      sitemaps: false,
    },
  },
})
describe('i18n prefix', () => {
  it('basic', async () => {
    const posts = await $fetch('/sitemap.xml')

    expect(posts).toMatchInlineSnapshot(`
      "<?xml version=\\"1.0\\" encoding=\\"UTF-8\\"?><?xml-stylesheet type=\\"text/xsl\\" href=\\"/__sitemap__/style.xsl\\"?>
      <urlset xmlns:xsi=\\"http://www.w3.org/2001/XMLSchema-instance\\" xmlns:video=\\"http://www.google.com/schemas/sitemap-video/1.1\\" xmlns:xhtml=\\"http://www.w3.org/1999/xhtml\\" xmlns:image=\\"http://www.google.com/schemas/sitemap-image/1.1\\" xmlns:news=\\"http://www.google.com/schemas/sitemap-news/0.9\\" xsi:schemaLocation=\\"http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd http://www.google.com/schemas/sitemap-image/1.1 http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd\\" xmlns=\\"http://www.sitemaps.org/schemas/sitemap/0.9\\">
          <url>
              <loc>https://nuxtseo.com/en</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"en-US\\" href=\\"https://nuxtseo.com/en\\" />
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr-FR\\" href=\\"https://nuxtseo.com/fr\\" />
              <xhtml:link rel=\\"alternate\\" hreflang=\\"x-default\\" href=\\"https://nuxtseo.com/en\\" />
          </url>
          <url>
              <loc>https://nuxtseo.com/fr</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"en-US\\" href=\\"https://nuxtseo.com/en\\" />
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr-FR\\" href=\\"https://nuxtseo.com/fr\\" />
              <xhtml:link rel=\\"alternate\\" hreflang=\\"x-default\\" href=\\"https://nuxtseo.com/en\\" />
          </url>
          <url>
              <loc>https://nuxtseo.com/en/extra</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr-FR\\" href=\\"https://nuxtseo.com/fr/extra\\" />
              <xhtml:link rel=\\"alternate\\" hreflang=\\"en-US\\" href=\\"https://nuxtseo.com/en/extra\\" />
              <xhtml:link rel=\\"alternate\\" hreflang=\\"x-default\\" href=\\"https://nuxtseo.com/en/extra\\" />
          </url>
          <url>
              <loc>https://nuxtseo.com/en/test</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"en-US\\" href=\\"https://nuxtseo.com/en/test\\" />
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr-FR\\" href=\\"https://nuxtseo.com/fr/test\\" />
              <xhtml:link rel=\\"alternate\\" hreflang=\\"x-default\\" href=\\"https://nuxtseo.com/en/test\\" />
          </url>
          <url>
              <loc>https://nuxtseo.com/fr/extra</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr-FR\\" href=\\"https://nuxtseo.com/fr/extra\\" />
              <xhtml:link rel=\\"alternate\\" hreflang=\\"en-US\\" href=\\"https://nuxtseo.com/en/extra\\" />
              <xhtml:link rel=\\"alternate\\" hreflang=\\"x-default\\" href=\\"https://nuxtseo.com/en/extra\\" />
          </url>
          <url>
              <loc>https://nuxtseo.com/fr/test</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"en-US\\" href=\\"https://nuxtseo.com/en/test\\" />
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr-FR\\" href=\\"https://nuxtseo.com/fr/test\\" />
              <xhtml:link rel=\\"alternate\\" hreflang=\\"x-default\\" href=\\"https://nuxtseo.com/en/test\\" />
          </url>
          <url>
              <loc>https://nuxtseo.com/en/__sitemap/url</loc>
              <changefreq>weekly</changefreq>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr-FR\\" href=\\"https://nuxtseo.com/fr/__sitemap/url\\" />
              <xhtml:link rel=\\"alternate\\" hreflang=\\"en-US\\" href=\\"https://nuxtseo.com/en/__sitemap/url\\" />
              <xhtml:link rel=\\"alternate\\" hreflang=\\"x-default\\" href=\\"https://nuxtseo.com/en/__sitemap/url\\" />
          </url>
          <url>
              <loc>https://nuxtseo.com/fr/__sitemap/url</loc>
              <changefreq>weekly</changefreq>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr-FR\\" href=\\"https://nuxtseo.com/fr/__sitemap/url\\" />
              <xhtml:link rel=\\"alternate\\" hreflang=\\"en-US\\" href=\\"https://nuxtseo.com/en/__sitemap/url\\" />
              <xhtml:link rel=\\"alternate\\" hreflang=\\"x-default\\" href=\\"https://nuxtseo.com/en/__sitemap/url\\" />
          </url>
      </urlset>"
    `)
  }, 60000)
})
