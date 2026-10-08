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
    '/sub/page': {
      sitemap: {
        changefreq: 'weekly',
        priority: 0.5,
      },
    },
  },

  compatibilityDate: '2025-01-15',

  nitro: {
    hooks: {
      'prerender:generate'(route) {
        if (route.route === '/private/one')
          route._sitemap = { loc: 'https://alternate.example/private/one' }
        if (route.route === '/dynamic/public')
          route._sitemap = { loc: 'https://alternate.example/dynamic/public' }
      },
    },
    prerender: {
      crawlLinks: true,
      routes: ['/', '/about', '/noindex', '/hidden', '/sub/page', '/private/one', '/private/public', '/dynamic/public', '/optional', '/optional/one', '/repeated/one/two', '/mixed/prefix-one', '/numeric/42', '/nested/private/one'],
    },
  },

  sitemap: {
    autoLastmod: false,
    credits: false,
    debug: true,
  },
})
