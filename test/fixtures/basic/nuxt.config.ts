import NuxtSitemap from '../../../src/module'

// https://v3.nuxtjs.org/api/configuration/nuxt.config
export default defineNuxtConfig({
  modules: [
    NuxtSitemap,
  ],

  site: {
    url: 'https://nuxtseo.com',
  },

  routeRules: {
    '/foo-redirect': {
      redirect: '/foo',
    },
  },

  compatibilityDate: '2025-01-15',

  sitemap: {
    autoLastmod: false,
    credits: false,
    debug: true,
  },
})