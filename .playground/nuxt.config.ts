import { defineNuxtConfig } from 'nuxt/config'
import NuxtSimpleSitemap from '../src/module'

export default defineNuxtConfig({
  modules: [
    NuxtSimpleSitemap,
    'nuxt-simple-robots',
    '@nuxtjs/i18n',
    '@nuxt/content',
    '@nuxthq/ui',
    'nuxt-icon'
  ],
  ignorePrefix: 'ignore-',
  i18n: {
    locales: ['en', 'fr'],
    defaultLocale: 'en',
  },
  nitro: {
    plugins: ['plugins/sitemap.ts'],
    prerender: {
      routes: [
        '/should-be-in-sitemap',
        '/foo.bar/',
        '/test.doc'
      ],
      failOnError: false,
    },
  },
  content: {
    documentDriven: {
      path: '/content'
    },
  },
  site: {
    url: 'https://nuxtseo.com'
  },

  // app: {
  //   baseURL: '/base'
  // },

  devtools: true,

  robots: {
    indexable: true,
  },
  sitemap: {
    debug: true,
    autoAlternativeLangPrefixes: true,
    // sitemapName: 'test.xml',
    // dynamicUrlsApiEndpoint: '/__sitemap',
    xslColumns: [
      { label: 'URL', width: '50%' },
      { label: 'Last Modified', select: 'sitemap:lastmod', width: '25%' },
      { label: 'Hreflangs', select: 'count(xhtml)', width: '25%' },
    ],
    defaultSitemapsChunkSize: 10,
    sitemaps: {
      posts: {
        include: ['/blog/**']
      },
      pages: {
        dynamicUrlsApiEndpoint: '/api/sitemap-foo',
        exclude: ['/blog/**'],
        urls: [
          {
            loc: '/about',
            lastmod: '2023-02-21T08:50:52.000Z',
            alternatives: [
              {
                href: '/fr/about',
                hreflang: 'fr'
              }
            ],
            images: [
              {
                loc: 'https://example.com/image-3.jpg',
              },
            ]
          }
        ]
      },
      index: [
        { sitemap: 'https://www.odysseytraveller.com/sitemap-pages.xml' }
      ]
    }
  },
  routeRules: {
    '/secret': {
      index: false
    },
    '/users-test/*': {
      sitemap: {
        lastmod: new Date(2023, 1, 21, 4, 50, 52),
        changefreq: 'weekly',
        priority: 0.3,
        images: []
      }
    },
    '/should-not-be-in-sitemap/*': {},
    '/about-redirect': {
      redirect: '/about'
    },
    '/about': {
      sitemap: {
        lastmod: new Date(2023, 1, 21, 8, 50, 52),
        changefreq: 'daily',
        priority: 0.3,
        images: [
          {
            loc: 'https://example.com/image.jpg',
          },
          {
            loc: 'https://example.com/image2.jpg',
          }
        ]
      }
    },
  }
})
