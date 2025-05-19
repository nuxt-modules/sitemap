import { defineNuxtConfig } from 'nuxt/config'
import NuxtSitemap from '../../../src/module'

export default defineNuxtConfig({
  modules: [
    NuxtSitemap,
  ],
  site: {
    url: 'https://example.com',
  },
  nitro: {
    plugins: ['~/server/plugins/sources-hook.ts'],
  },
  sitemap: {
    sources: [
      '/api/initial-source',
    ],
  },
})
