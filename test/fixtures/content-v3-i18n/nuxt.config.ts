import NuxtSitemap from '../../../src/module'

export default defineNuxtConfig({
  modules: [
    NuxtSitemap,
    '@nuxt/content',
    '@nuxtjs/i18n',
  ],

  site: {
    url: 'https://nuxtseo.com',
  },
  compatibilityDate: '2024-12-06',

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
        code: 'ja',
        iso: 'ja-JP',
      },
    ],
  },

  sitemap: {
    autoLastmod: false,
    credits: false,
    debug: true,
  },
})
