import NuxtSitemap from '../../../src/module'

export default defineNuxtConfig({
  modules: [
    NuxtSitemap,
    'nuxt-i18n-micro',
  ],
  site: {
    url: 'https://nuxtseo.com',
  },

  compatibilityDate: '2024-07-22',
  nitro: {
    prerender: {
      failOnError: false,
      ignore: ['/'],
    },
  },
  i18n: {
    baseUrl: 'https://nuxtseo.com',
    detectBrowserLanguage: false,
    defaultLocale: 'en',
    strategy: 'prefix',
    locales: [
      {
        code: 'en',
        iso: 'en-US',
      },
      {
        code: 'es',
        iso: 'es-ES',
      },
      {
        code: 'fr',
        iso: 'fr-FR',
      },
    ],
    meta: true,
  },
  sitemap: {
    sources: ['/__sitemap'],
    autoLastmod: false,
    credits: false,
    debug: true,
  },
})
