import NuxtSitemap from '../../../src/module'

export default defineNuxtConfig({
  modules: [
    NuxtSitemap,
  ],

  site: {
    url: 'https://example.com',
  },

  compatibilityDate: '2024-07-22',

  sitemap: {
    autoI18n: false,
    autoLastmod: false,
    credits: false,
    debug: true,
  },
})
