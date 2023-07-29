import { describe, expect, it } from 'vitest'
import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../.playground'),
  build: true,
  server: true,
  nuxtConfig: {
    i18n: {
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
    sitemap: {
      credits: false,
      autoLastmod: false,
      siteUrl: 'https://nuxtseo.com',
    },
  },
})
describe('i18n', () => {
  it('basic', async () => {
    let posts = await $fetch('/posts-sitemap.xml')

    // strip lastmod
    posts = posts.replace(/<lastmod>.*<\/lastmod>/g, '')

    expect(posts).toMatchInlineSnapshot(`
      "<?xml version=\\"1.0\\" encoding=\\"UTF-8\\"?><?xml-stylesheet type=\\"text/xsl\\" href=\\"/__sitemap__/style.xsl\\"?>
      <urlset xmlns:xsi=\\"http://www.w3.org/2001/XMLSchema-instance\\" xmlns:video=\\"http://www.google.com/schemas/sitemap-video/1.1\\" xmlns:xhtml=\\"http://www.w3.org/1999/xhtml\\" xmlns:image=\\"http://www.google.com/schemas/sitemap-image/1.1\\" xsi:schemaLocation=\\"http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd http://www.google.com/schemas/sitemap-image/1.1 http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd\\" xmlns=\\"http://www.sitemaps.org/schemas/sitemap/0.9\\">
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
      </urlset>"
    `)

    expect((await $fetch('/pages-sitemap.xml')).replace(/<lastmod>.*<\/lastmod>/g, '')).toMatchInlineSnapshot(`
      "<?xml version=\\"1.0\\" encoding=\\"UTF-8\\"?><?xml-stylesheet type=\\"text/xsl\\" href=\\"/__sitemap__/style.xsl\\"?>
      <urlset xmlns:xsi=\\"http://www.w3.org/2001/XMLSchema-instance\\" xmlns:video=\\"http://www.google.com/schemas/sitemap-video/1.1\\" xmlns:xhtml=\\"http://www.w3.org/1999/xhtml\\" xmlns:image=\\"http://www.google.com/schemas/sitemap-image/1.1\\" xsi:schemaLocation=\\"http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd http://www.google.com/schemas/sitemap-image/1.1 http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd\\" xmlns=\\"http://www.sitemaps.org/schemas/sitemap/0.9\\">
          <url>
              <loc>https://nuxtseo.com/about</loc>
              
              <xhtml:link rel=\\"alternate\\" href=\\"https://nuxtseo.com/fr/about\\" hreflang=\\"fr\\" />
              <image:image>
                  <image:loc>https://example.com/image.jpg</image:loc>
              </image:image>
              <image:image>
                  <image:loc>https://example.com/image2.jpg</image:loc>
              </image:image>
              <image:image>
                  <image:loc>https://example.com/image-3.jpg</image:loc>
              </image:image>
              <changefreq>daily</changefreq>
              <priority>0.3</priority>
          </url>
          <url>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxtseo.com/fr\\" />
              <loc>https://nuxtseo.com/en</loc>
          </url>
          <url>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxtseo.com/fr/a-propos\\" />
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxtseo.com/fr/about\\" />
              <loc>https://nuxtseo.com/en/about</loc>
          </url>
          <url>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxtseo.com/fr/blog\\" />
              <loc>https://nuxtseo.com/en/blog</loc>
          </url>
          <url>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxtseo.com/fr/hidden-path-but-in-sitemap\\" />
              <loc>https://nuxtseo.com/en/hidden-path-but-in-sitemap</loc>
          </url>
          <url>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxtseo.com/fr/new-page\\" />
              <loc>https://nuxtseo.com/en/new-page</loc>
          </url>
          <url>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxtseo.com/fr/secret\\" />
              <loc>https://nuxtseo.com/en/secret</loc>
          </url>
          <url>
              <loc>https://nuxtseo.com/en/services</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxtseo.com/fr/offres\\" />
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
          <url>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxtseo.com/fr/blog/categories\\" />
              <loc>https://nuxtseo.com/en/blog/categories</loc>
          </url>
          <url>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxtseo.com/fr/blog/tags\\" />
              <loc>https://nuxtseo.com/en/blog/tags</loc>
          </url>
          <url>
              <loc>https://nuxtseo.com/en/services/coaching</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxtseo.com/fr/offres/formation\\" />
          </url>
          <url>
              <loc>https://nuxtseo.com/en/services/development</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxtseo.com/fr/offres/developement\\" />
          </url>
          <url>
              <loc>https://nuxtseo.com/en/services/development/app</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxtseo.com/fr/offres/developement/app\\" />
          </url>
          <url>
              <loc>https://nuxtseo.com/en/services/development/website</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxtseo.com/fr/offres/developement/site-web\\" />
          </url>
      </urlset>"
    `)
  }, 60000)
})
