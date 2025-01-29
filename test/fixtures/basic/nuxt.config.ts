import NuxtSitemap from '../../../src/module'

// https://v3.nuxtjs.org/api/configuration/nuxt.config
export default defineNuxtConfig({
  modules: [
    NuxtSitemap,
  ],

  site: {
    url: 'https://nuxtseo.com',
  },

  routeRules: {
    '/foo-redirect': {
      redirect: '/foo',
    },
  },

  compatibilityDate: '2025-01-15',

  debug: process.env.NODE_ENV === 'test',

  sitemap: {
    autoLastmod: false,
    credits: false,
    debug: true,
    sitemaps: {
      foo: {
        sources: ['/api/sitemap/foo'],
        defaults: {
          changefreq: 'weekly',
          priority: 0.7,
        },
      },
      bar: {
        sources: ['/api/sitemap/bar'],
      },
      empty: {
        sources: ['/api/sitemap/empty'],
      },
    },
  },
})
