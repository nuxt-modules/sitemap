import { describe, expect, it } from 'vitest'
import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../../fixtures/i18n'),
  build: true,
  server: true,
  nuxtConfig: {
    sitemap: { sitemaps: false },
    i18n: {
      locales: [
        'en',
        'fr',
      ],
      pages: {
        'about': {
          en: '/about',
          fr: '/a-propos',
        },
        'services/index': {
          en: '/services',
          fr: '/offres',
        },
        'services/development/index': {
          en: '/services/development',
          fr: '/offres/developement',
        },
        'services/development/app/index': {
          en: '/services/development/app',
          fr: '/offres/developement/app',
        },
        'services/development/website/index': {
          en: '/services/development/website',
          fr: '/offres/developement/site-web',
        },
        'services/coaching/index': {
          en: '/services/coaching',
          fr: '/offres/formation',
        },
      },
    },
  },
})
describe('i18n', () => {
  it('basic', async () => {
    const posts = await $fetch('/sitemap.xml')

    expect(posts).toMatchInlineSnapshot(`
      "<?xml version=\\"1.0\\" encoding=\\"UTF-8\\"?><?xml-stylesheet type=\\"text/xsl\\" href=\\"/__sitemap__/style.xsl\\"?>
      <urlset xmlns:xsi=\\"http://www.w3.org/2001/XMLSchema-instance\\" xmlns:video=\\"http://www.google.com/schemas/sitemap-video/1.1\\" xmlns:xhtml=\\"http://www.w3.org/1999/xhtml\\" xmlns:image=\\"http://www.google.com/schemas/sitemap-image/1.1\\" xmlns:news=\\"http://www.google.com/schemas/sitemap-news/0.9\\" xsi:schemaLocation=\\"http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd http://www.google.com/schemas/sitemap-image/1.1 http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd\\" xmlns=\\"http://www.sitemaps.org/schemas/sitemap/0.9\\">
          <url>
              <loc>https://nuxtseo.com/en/about</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"en-US\\" href=\\"https://nuxtseo.com/en/about\\" />
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr-FR\\" href=\\"https://nuxtseo.com/en/a-propos\\" />
              <xhtml:link rel=\\"alternate\\" hreflang=\\"x-default\\" href=\\"https://nuxtseo.com/about\\" />
          </url>
          <url>
              <loc>https://nuxtseo.com/en/services</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"en-US\\" href=\\"https://nuxtseo.com/en/services\\" />
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr-FR\\" href=\\"https://nuxtseo.com/en/offres\\" />
              <xhtml:link rel=\\"alternate\\" hreflang=\\"x-default\\" href=\\"https://nuxtseo.com/services\\" />
          </url>
          <url>
              <loc>https://nuxtseo.com/fr/a-propos</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"en-US\\" href=\\"https://nuxtseo.com/fr/about\\" />
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr-FR\\" href=\\"https://nuxtseo.com/fr/a-propos\\" />
              <xhtml:link rel=\\"alternate\\" hreflang=\\"x-default\\" href=\\"https://nuxtseo.com/about\\" />
          </url>
          <url>
              <loc>https://nuxtseo.com/fr/offres</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"en-US\\" href=\\"https://nuxtseo.com/fr/services\\" />
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr-FR\\" href=\\"https://nuxtseo.com/fr/offres\\" />
              <xhtml:link rel=\\"alternate\\" hreflang=\\"x-default\\" href=\\"https://nuxtseo.com/services\\" />
          </url>
          <url>
              <loc>https://nuxtseo.com/en/__sitemap/url</loc>
              <changefreq>weekly</changefreq>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"x-default\\" href=\\"https://nuxtseo.com/en/__sitemap/url\\" />
              <xhtml:link rel=\\"alternate\\" hreflang=\\"en-US\\" href=\\"https://nuxtseo.com/en/__sitemap/url\\" />
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr-FR\\" href=\\"https://nuxtseo.com/fr/__sitemap/url\\" />
              <xhtml:link rel=\\"alternate\\" hreflang=\\"es-ES\\" href=\\"https://nuxtseo.com/es/__sitemap/url\\" />
          </url>
          <url>
              <loc>https://nuxtseo.com/en/services/coaching</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"en-US\\" href=\\"https://nuxtseo.com/en/services/coaching\\" />
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr-FR\\" href=\\"https://nuxtseo.com/en/offres/formation\\" />
              <xhtml:link rel=\\"alternate\\" hreflang=\\"x-default\\" href=\\"https://nuxtseo.com/services/coaching\\" />
          </url>
          <url>
              <loc>https://nuxtseo.com/en/services/development</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"en-US\\" href=\\"https://nuxtseo.com/en/services/development\\" />
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr-FR\\" href=\\"https://nuxtseo.com/en/offres/developement\\" />
              <xhtml:link rel=\\"alternate\\" hreflang=\\"x-default\\" href=\\"https://nuxtseo.com/services/development\\" />
          </url>
          <url>
              <loc>https://nuxtseo.com/es/__sitemap/url</loc>
              <changefreq>weekly</changefreq>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"x-default\\" href=\\"https://nuxtseo.com/en/__sitemap/url\\" />
              <xhtml:link rel=\\"alternate\\" hreflang=\\"en-US\\" href=\\"https://nuxtseo.com/en/__sitemap/url\\" />
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr-FR\\" href=\\"https://nuxtseo.com/fr/__sitemap/url\\" />
              <xhtml:link rel=\\"alternate\\" hreflang=\\"es-ES\\" href=\\"https://nuxtseo.com/es/__sitemap/url\\" />
          </url>
          <url>
              <loc>https://nuxtseo.com/fr/__sitemap/url</loc>
              <changefreq>weekly</changefreq>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"x-default\\" href=\\"https://nuxtseo.com/en/__sitemap/url\\" />
              <xhtml:link rel=\\"alternate\\" hreflang=\\"en-US\\" href=\\"https://nuxtseo.com/en/__sitemap/url\\" />
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr-FR\\" href=\\"https://nuxtseo.com/fr/__sitemap/url\\" />
              <xhtml:link rel=\\"alternate\\" hreflang=\\"es-ES\\" href=\\"https://nuxtseo.com/es/__sitemap/url\\" />
          </url>
          <url>
              <loc>https://nuxtseo.com/fr/offres/developement</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"en-US\\" href=\\"https://nuxtseo.com/fr/services/development\\" />
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr-FR\\" href=\\"https://nuxtseo.com/fr/offres/developement\\" />
              <xhtml:link rel=\\"alternate\\" hreflang=\\"x-default\\" href=\\"https://nuxtseo.com/services/development\\" />
          </url>
          <url>
              <loc>https://nuxtseo.com/fr/offres/formation</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"en-US\\" href=\\"https://nuxtseo.com/fr/services/coaching\\" />
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr-FR\\" href=\\"https://nuxtseo.com/fr/offres/formation\\" />
              <xhtml:link rel=\\"alternate\\" hreflang=\\"x-default\\" href=\\"https://nuxtseo.com/services/coaching\\" />
          </url>
          <url>
              <loc>https://nuxtseo.com/en/services/development/app</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"en-US\\" href=\\"https://nuxtseo.com/en/services/development/app\\" />
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr-FR\\" href=\\"https://nuxtseo.com/en/offres/developement/app\\" />
              <xhtml:link rel=\\"alternate\\" hreflang=\\"x-default\\" href=\\"https://nuxtseo.com/services/development/app\\" />
          </url>
          <url>
              <loc>https://nuxtseo.com/en/services/development/website</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"en-US\\" href=\\"https://nuxtseo.com/en/services/development/website\\" />
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr-FR\\" href=\\"https://nuxtseo.com/en/offres/developement/site-web\\" />
              <xhtml:link rel=\\"alternate\\" hreflang=\\"x-default\\" href=\\"https://nuxtseo.com/services/development/website\\" />
          </url>
          <url>
              <loc>https://nuxtseo.com/fr/offres/developement/app</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"en-US\\" href=\\"https://nuxtseo.com/fr/services/development/app\\" />
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr-FR\\" href=\\"https://nuxtseo.com/fr/offres/developement/app\\" />
              <xhtml:link rel=\\"alternate\\" hreflang=\\"x-default\\" href=\\"https://nuxtseo.com/services/development/app\\" />
          </url>
          <url>
              <loc>https://nuxtseo.com/fr/offres/developement/site-web</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"en-US\\" href=\\"https://nuxtseo.com/fr/services/development/website\\" />
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr-FR\\" href=\\"https://nuxtseo.com/fr/offres/developement/site-web\\" />
              <xhtml:link rel=\\"alternate\\" hreflang=\\"x-default\\" href=\\"https://nuxtseo.com/services/development/website\\" />
          </url>
      </urlset>"
    `)
  }, 60000)
})
