import NuxtSitemap from '../../../src/module'

// https://v3.nuxtjs.org/api/configuration/nuxt.config
export default defineNuxtConfig({
  modules: [
    NuxtSitemap,
  ],
  site: {
    url: 'https://nuxtseo.com',
  },
  debug: process.env.NODE_ENV === 'test',
  sitemap: {
    autoLastmod: false,
    credits: false,
    debug: true,
    defaultSitemapsChunkSize: 5,
    sitemaps: true,
    urls: Array.from({ length: 20 }, (_, i) => `/foo/${i + 1}`),
    excludeAppSources: true,
  },
})
