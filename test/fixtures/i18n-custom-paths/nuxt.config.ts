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
      failOnError: false,
      ignore: ['/'],
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
        code: 'es',
        iso: 'es-ES',
      },
      {
        code: 'fr',
        iso: 'fr-FR',
      },
    ],
    pages: {
      test: {
        en: '/test',
        es: '/prueba',
        fr: '/teste',
      },
      about: {
        en: '/about',
        es: '/acerca-de',
        fr: '/a-propos',
      },
      // dynamic route with single parameter (issue #542)
      posts: {
        en: '/posts/[slug]',
        es: '/articulos/[slug]',
        fr: '/article/[slug]',
      },
      // dynamic route with multiple parameters
      products: {
        en: '/products/[category]/[id]',
        es: '/productos/[category]/[id]',
        fr: '/produits/[category]/[id]',
      },
    },
  },
  sitemap: {
    sources: ['/__sitemap'],
    autoLastmod: false,
    credits: false,
    debug: true,
  },
})
