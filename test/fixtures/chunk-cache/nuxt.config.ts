import NuxtSitemap from '../../../src/module'

export default defineNuxtConfig({
  modules: [NuxtSitemap],
  site: { url: 'https://nuxtseo.com' },
  sitemap: {
    autoLastmod: false,
    credits: false,
    cacheMaxAgeSeconds: 600,
    runtimeCacheStorage: { driver: 'memory' },
    sitemaps: {
      posts: {
        sources: ['/api/posts'],
        chunks: 5,
      },
    },
  },
})
