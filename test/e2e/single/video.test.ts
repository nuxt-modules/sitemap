import { describe, expect, it } from 'vitest'
import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../../fixtures/basic'),
  nuxtConfig: {
    sitemap: {
      urls: [
        {
          loc: 'https://www.example.com/videos/some_video_landing_page.html',
          videos: [
            {
              title: 'Grilling steaks for summer',
              thumbnail_loc: 'https://www.example.com/thumbs/123.jpg',
              description: 'Alkis shows you how to get perfectly done steaks every time',
              content_loc: 'https://streamserver.example.com/video123.mp4',
              player_loc: 'https://www.example.com/videoplayer.php?video=123',
              duration: 600,
              expiration_date: '2022-12-12T00:00:00+00:00',
              rating: 4.2,
              view_count: 12345,
              publication_date: '2007-11-05T19:00:00+00:00',
              family_friendly: 'yes',
              restriction: {
                relationship: 'allow',
                restriction: 'IE GB US CA',
              },
              platform: {
                relationship: 'allow',
                platform: 'web mobile',
              },
              requires_subscription: 'yes',
              price: [
                {
                  currency: 'EUR',
                  type: 'rent',
                  price: 3.99,
                },
              ],
              uploader: {
                uploader: 'GrillyMcGrillerson',
                info: 'https://example.com/users/grillymcgrillerson',
              },
              live: 'no',
              tag: ['steak', 'grilling', 'summer'],
            },
          ],
        },
      ],
    },
  },
})
describe('video', () => {
  it('basic', async () => {
    let sitemap = await $fetch('/sitemap.xml')

    // strip lastmod
    sitemap = sitemap.replace(/<lastmod>.*<\/lastmod>/g, '')

    expect(sitemap).toMatchInlineSnapshot(`
      "<?xml version="1.0" encoding="UTF-8"?><?xml-stylesheet type="text/xsl" href="/__sitemap__/style.xsl"?>
      <urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd http://www.google.com/schemas/sitemap-image/1.1 http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd" xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
          <url>
              <loc>https://nuxtseo.com/</loc>
          </url>
          <url>
              <loc>https://nuxtseo.com/about</loc>
              <changefreq>daily</changefreq>
              <priority>0.8</priority>
          </url>
          <url>
              <loc>https://nuxtseo.com/crawled</loc>
          </url>
          <url>
              <loc>https://nuxtseo.com/sub/page</loc>
          </url>
          <url>
              <loc>https://www.example.com/videos/some_video_landing_page.html</loc>
              <video:video>
                  <video:title>Grilling steaks for summer</video:title>
                  <video:thumbnail_loc>https://www.example.com/thumbs/123.jpg</video:thumbnail_loc>
                  <video:description>Alkis shows you how to get perfectly done steaks every time</video:description>
                  <video:content_loc>https://streamserver.example.com/video123.mp4</video:content_loc>
                  <video:player_loc>https://www.example.com/videoplayer.php?video=123</video:player_loc>
                  <video:duration>600</video:duration>
                  <video:expiration_date>2022-12-12T00:00:00+00:00</video:expiration_date>
                  <video:rating>4.2</video:rating>
                  <video:view_count>12345</video:view_count>
                  <video:publication_date>2007-11-05T19:00:00+00:00</video:publication_date>
                  <video:family_friendly>yes</video:family_friendly>
                  <video:restriction relationship="allow">IE GB US CA</video:restriction>
                  <video:platform relationship="allow">web mobile</video:platform>
                  <video:requires_subscription>yes</video:requires_subscription>
                  <video:price currency="EUR" type="rent">3.99</video:price>
                  <video:uploader info="https://example.com/users/grillymcgrillerson">GrillyMcGrillerson</video:uploader>
                  <video:live>no</video:live>
                  <video:tag>steak</video:tag>
                  <video:tag>grilling</video:tag>
                  <video:tag>summer</video:tag>
              </video:video>
          </url>
      </urlset>"
    `)
  }, 60000)
})
