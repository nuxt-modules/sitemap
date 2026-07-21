import NuxtSitemap from '../../../src/module'

export default defineNuxtConfig({
  modules: [NuxtSitemap],

  compatibilityDate: '2025-01-15',

  site: {
    url: 'https://streaming.example.com',
  },

  sitemap: {
    cacheMaxAgeSeconds: 60,
    credits: false,
    debug: true,
    experimentalCompression: true,
    experimentalStreaming: true,
    xsl: false,
    sitemaps: {
      pages: {
        includeAppSources: false,
        urls: Array.from({ length: 2000 }, (_, index) => `/page-${index}`),
      },
      posts: {
        includeAppSources: false,
        urls: ['/post'],
      },
    },
  },
})
