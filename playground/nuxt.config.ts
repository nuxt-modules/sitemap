import { resolve } from 'node:path'
import { defineNuxtConfig } from 'nuxt/config'
import { defineNuxtModule } from '@nuxt/kit'
import { startSubprocess } from '@nuxt/devtools-kit'
import NuxtSitemap from '../src/module'

export default defineNuxtConfig({
  modules: [
    NuxtSitemap,
    '@nuxtjs/robots',
    '@nuxtjs/i18n',
    '@nuxt/content',
    '@nuxt/ui',
    /**
     * Start a sub Nuxt Server for developing the client
     *
     * The terminal output can be found in the Terminals tab of the devtools.
     */
    defineNuxtModule({
      setup(_, nuxt) {
        if (!nuxt.options.dev)
          return

        const subprocess = startSubprocess(
          {
            command: 'npx',
            args: ['nuxi', 'dev', '--port', '3030'],
            cwd: resolve(__dirname, '../client'),
          },
          {
            id: 'sitemap',
            name: 'Sitemap Client Dev',
          },
        )
        subprocess.getProcess().stdout?.on('data', (data) => {
          // eslint-disable-next-line no-console
          console.log(` sub: ${data.toString()}`)
        })

        process.on('exit', () => {
          subprocess.terminate()
        })

        // process.getProcess().stdout?.pipe(process.stdout)
        // process.getProcess().stderr?.pipe(process.stderr)
      },
    }),
  ],
  site: {
    url: 'https://sitemap-edge-demo.vercel.app/',
  },
  content: {
    documentDriven: true,
  },
  ignorePrefix: 'ignore-',
  routeRules: {
    '/api/prerendered': {
      prerender: true,
    },
    '/secret': {
      index: false,
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

  robots: {
    indexable: true,
  },
  sitemap: {
    debug: true,
    // sitemapName: 'test.xml',
    // dynamicUrlsApiEndpoint: '/__sitemap',
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
