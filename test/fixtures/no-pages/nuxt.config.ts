import NuxtSitemap from '../../../src/module'

// https://v3.nuxtjs.org/api/configuration/nuxt.config
export default defineNuxtConfig({
  modules: [
    NuxtSitemap,
  ],

  site: {
    url: 'https://nuxtseo.com',
  },

  compatibilityDate: '2025-03-14',

  sitemap: {
    sources: ['/__sitemap'],
    autoLastmod: false,
    credits: false,
    debug: true,
  },
})
