import NuxtSitemap from '../../../src/module'

export default defineNuxtConfig({
  modules: [
    NuxtSitemap,
    '@nuxtjs/i18n',
  ],

  site: {
    url: 'https://nuxtseo.com',
  },

  compatibilityDate: '2024-07-22',

  nitro: {
    prerender: {
      routes: ['/', '/de'],
      crawlLinks: false,
    },
  },

  i18n: {
    baseUrl: 'https://nuxtseo.com',
    detectBrowserLanguage: false,
    defaultLocale: 'en',
    strategy: 'prefix_except_default',
    locales: [
      {
        code: 'en',
        iso: 'en-US',
      },
      {
        code: 'de',
        iso: 'de-DE',
      },
    ],
  },

  sitemap: {
    autoLastmod: false,
    credits: false,
    debug: true,
  },
})
