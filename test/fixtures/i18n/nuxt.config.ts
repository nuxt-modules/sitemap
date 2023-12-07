import NuxtSimpleSitemap from '../../../src/module'

// https://v3.nuxtjs.org/api/configuration/nuxt.config
export default defineNuxtConfig({
  modules: [
    NuxtSimpleSitemap,
    '@nuxtjs/i18n',
  ],
  site: {
    url: 'https://nuxtseo.com',
  },
  nitro: {
    prerender: {
      failOnError: false,
      ignore: ['/']
    },
  },
  sitemap: {
    dynamicUrlsApiEndpoint: '/__sitemap',
    autoLastmod: false,
    credits: false,
    debug: true,
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
})
