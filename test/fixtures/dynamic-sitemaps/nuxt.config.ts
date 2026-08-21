import NuxtSitemap from '../../../src/module'

// https://v3.nuxtjs.org/api/configuration/nuxt.config
export default defineNuxtConfig({
  modules: [
    NuxtSitemap,
  ],
  site: {
    url: 'https://nuxtseo.com',
  },
  sitemap: {
    autoLastmod: false,
    credits: false,
    debug: true,
    // disable caching so the e2e growth test sees newly registered sitemaps immediately
    cacheMaxAgeSeconds: false,
    sitemaps: {
      pages: {
        urls: ['/about', '/contact'],
        excludeAppSources: true,
      },
    },
  },
})
