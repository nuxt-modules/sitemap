import NuxtSitemap from '../../../src/module'

export default defineNuxtConfig({
  modules: [
    NuxtSitemap,
    '@nuxtjs/i18n',
  ],

  site: {
    url: 'https://example.com',
  },

  compatibilityDate: '2024-07-22',

  i18n: {
    baseUrl: 'https://example.com',
    strategy: 'prefix_except_default',
    defaultLocale: 'fr',
    detectBrowserLanguage: false,
    locales: [
      {
        code: 'en',
        iso: 'en-CA',
        language: 'en',
      },
      {
        code: 'fr',
        iso: 'fr-CA',
        language: 'fr',
      },
    ],
    trailingSlash: true,
    customRoutes: 'config',
    pages: {
      'submit-art': {
        fr: '/envoyer-tableau',
        en: '/submit-art',
      },
      'privacy-policy': {
        fr: '/politique-de-confidentialite',
        en: '/privacy-policy',
      },
    },
  },

  sitemap: {
    autoI18n: false,
    autoLastmod: false,
    credits: false,
    debug: true,
  },
})
