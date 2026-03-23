import { defineNuxtConfig } from 'nuxt/config'
import NuxtSitemap from '../src/module'

export default defineNuxtConfig({
  modules: [
    NuxtSitemap,
    '@nuxtjs/robots',
    '@nuxtjs/i18n',
    '@nuxt/content',
    '@nuxt/ui',
  ],

  site: {
    url: 'https://sitemap-edge-demo.vercel.app/',
  },

  ignorePrefix: 'ignore-',

  routeRules: {
    '/api/prerendered': {
      prerender: true,
    },
    '/secret': {
      robots: false,
    },
    '/users-test/*': {
      sitemap: {
        lastmod: new Date(2023, 1, 21, 4, 50, 52),
        changefreq: 'weekly',
        priority: 0.3,
        images: [],
      },
    },
    '/should-not-be-in-sitemap/*': {},
    '/about-redirect': {
      redirect: '/about',
    },
    '/about': {
      sitemap: {
        lastmod: '2023-01-21',
        changefreq: 'daily',
        priority: 0.3,
        images: [
          {
            loc: 'https://example.com/image.jpg',
          },
          {
            loc: 'https://example.com/image2.jpg',
          },
        ],
      },
    },
  },

  experimental: {
    inlineRouteRules: true,
  },

  compatibilityDate: '2025-01-17',

  nitro: {
    typescript: {
      internalPaths: true,
    },
    plugins: ['plugins/sitemap.ts'],
    prerender: {
      routes: [
        // '/sitemap_index.xml',
        '/prerender',
        '/prerender-video',
        '/should-be-in-sitemap',
        '/foo.bar/',
        '/test.doc',
        '/api/prerendered',
      ],
      failOnError: false,
    },
  },

  i18n: {
    locales: ['en', 'fr'],
    defaultLocale: 'en',
  },

  // app: {
  //   baseURL: '/base'
  // },

  sitemap: {
    debug: true,
    // sitemapName: 'test.xml',
    minify: false,
    cacheMaxAgeSeconds: 10,
    xslColumns: [
      { label: 'URL', width: '50%' },
      { label: 'Last Modified', select: 'sitemap:lastmod', width: '25%' },
      { label: 'Hreflangs', select: 'count(xhtml:link)', width: '25%' },
    ],
    experimentalWarmUp: true,
    urls: [
      '/manual-url-test',
      { loc: '/bad-lastmod', lastmod: 'not-a-date' },
      { loc: '/bad-changefreq', changefreq: 'sometimes' as any },
      { loc: '/bad-priority', priority: 5 },
    ],
    sources: [
      '/some-invalid-url',
      ['https://api.example.com/pages/urls', { headers: { Authorization: 'Bearer <token>' } }],
    ],
    defaultSitemapsChunkSize: 10,
    sitemaps: {
      posts: {
        includeAppSources: true,
        urls: async () => {
          await new Promise((then) => {
            setTimeout(then, 5000)
          })
          return ['/slow-url']
        },
        include: ['/slow-url', '/en/blog/**', '/fr/blog/**', '/blog/**'],
      },
      pages: {
        includeAppSources: true,
        sources: [
          '/api/sitemap-foo',
          'https://example.com/invalid.json',
        ],
        exclude: ['/en/blog/**', '/fr/blog/**', '/blog/**', /.*hide-me.*/g],
        urls: [
          {
            loc: '/about',
            lastmod: '2023-02-21T08:50:52.000Z',
            alternatives: [
              {
                href: '/fr/about',
                hreflang: 'fr',
              },
            ],
            images: [
              {
                loc: 'https://example.com/image-3.jpg',
              },
            ],
          },
        ],
      },
      index: [
        { sitemap: 'https://www.example.com/sitemap-pages.xml' },
      ],
    },
  },
})
