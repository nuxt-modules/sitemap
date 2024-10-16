import NuxtSitemap from '../../../src/module'

// https://v3.nuxtjs.org/api/configuration/nuxt.config
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
  },
  sitemap: {
    dynamicUrlsApiEndpoint: '/__sitemap',
    autoLastmod: false,
    credits: false,
    debug: true,
  },
})
