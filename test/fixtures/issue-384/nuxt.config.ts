import LateHeaders from './late-headers'
import NuxtSitemap from '../../../src/module'

export default defineNuxtConfig({
  modules: [
    '@nuxtjs/robots',
    NuxtSitemap,
    LateHeaders,
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

  routeRules: {
    '/private': { headers: { 'x-robots-tag': 'noindex' } },
  },

  sitemap: {
    urls: ['/private', '/late'],
    autoLastmod: false,
    credits: false,
    debug: true,
  },
})
