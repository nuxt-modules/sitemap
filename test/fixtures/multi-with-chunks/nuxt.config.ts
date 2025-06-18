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
    defaultSitemapsChunkSize: 5,
    sitemaps: {
      pages: {
        urls: Array.from({ length: 20 }, (_, i) => `/page/${i + 1}`),
        excludeAppSources: true,
      },
      posts: {
        sources: [
          '/api/posts',
        ],
        chunks: true,
        chunkSize: 3,
      },
      products: {
        sources: [
          '/api/products',
        ],
        chunks: 10, // use 10 as chunk size
      },
    },
  },
})
