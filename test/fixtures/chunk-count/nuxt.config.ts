import NuxtSitemap from '../../../src/module'

export default defineNuxtConfig({
  modules: [NuxtSitemap],
  site: { url: 'https://nuxtseo.com' },
  sitemap: {
    autoLastmod: false,
    credits: false,
    sitemaps: {
      posts: {
        sources: ['/api/posts'],
        chunks: 5,
        chunkCount: 4,
      },
    },
  },
})
