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
    zeroRuntime: true,
    autoLastmod: false,
    credits: false,
  },
})
