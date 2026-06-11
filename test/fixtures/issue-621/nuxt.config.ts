import NuxtSitemap from '../../../src/module'

// https://github.com/nuxt-modules/sitemap/issues/621
// Two locales where one `language` tag is a prefix of the other:
//   zh -> language `zh`,      URLs at /zh/...
//   tw -> language `zh-Hant`, URLs at /tw/...
// Each per-locale sitemap (`zh` / `zh-Hant`) must only contain its own URLs.
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
        language: 'en-US',
      },
      {
        code: 'zh',
        language: 'zh',
      },
      {
        code: 'tw',
        language: 'zh-Hant',
      },
    ],
  },

  sitemap: {
    excludeAppSources: true,
    sources: ['/__sitemap'],
    autoLastmod: false,
    credits: false,
    debug: true,
  },
})
