import NuxtSitemap from '../../../src/module'

export default defineNuxtConfig({
  modules: [
    NuxtSitemap,
  ],
  site: {
    url: 'https://example.com',
  },
  sitemap: {
    cacheMaxAgeSeconds: 0,
    sitemapsPathPrefix: '/',
    sitemaps: {
      pages: {
        includeAppSources: true,
      },
      dynamic: {
        sources: ['/api/urls'],
        chunks: 10,
      },
    },
  },
})
