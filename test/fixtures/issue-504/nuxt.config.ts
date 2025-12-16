import { defineNuxtConfig } from 'nuxt/config'
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
    sitemapsPathPrefix: false,
    sitemaps: {
      test: {
        includeAppSources: true,
        sources: ['/api/__sitemap__/test'],
      },
    },
  },
})
