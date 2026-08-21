import NuxtSitemap from '../../../src/module'

export default defineNuxtConfig({
  modules: [NuxtSitemap],
  site: { url: 'https://nuxtseo.com' },
  compatibilityDate: '2025-01-15',
  sitemap: {
    autoLastmod: false,
    credits: false,
    cacheMaxAgeSeconds: 600,
    runtimeCacheStorage: { driver: 'memory' },
    excludeAppSources: true,
    sitemaps: {
      posts: {
        sources: ['/api/posts'],
      },
      pages: {
        sources: ['/api/posts'],
      },
    },
  },
})
