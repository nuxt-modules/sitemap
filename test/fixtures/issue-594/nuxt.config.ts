import NuxtSitemap from '../../../src/module'

export default defineNuxtConfig({
  modules: [
    NuxtSitemap,
  ],

  // no site url: forces the sitemap to fall back to the request origin in dev
  compatibilityDate: '2025-01-15',

  sitemap: {
    // mirrors the multi source setup from the issue
    sitemaps: {
      'sitemap-da': {
        urls: ['/da'],
      },
      'sitemap-en': {
        urls: ['/en'],
      },
    },
    autoLastmod: false,
    credits: false,
  },
})
