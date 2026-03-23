import NuxtSitemap from '../../../src/module'

export default defineNuxtConfig({
  modules: [
    '@nuxtjs/robots',
    NuxtSitemap,
  ],

  site: {
    url: 'https://nuxtseo.com',
  },

  robots: {
    groups: [
      {
        userAgent: '*',
        disallow: '/',
      },
    ],
  },

  compatibilityDate: '2025-01-15',

  sitemap: {
    autoLastmod: false,
    credits: false,
    debug: true,
  },
})
