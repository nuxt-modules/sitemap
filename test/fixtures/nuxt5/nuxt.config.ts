import { resolve } from 'node:path'
import NuxtSiteConfig from 'nuxt-site-config'
import NuxtSitemap from '@nuxtjs/sitemap'

export default defineNuxtConfig({
  workspaceDir: import.meta.dirname,
  vite: {
    resolve: { dedupe: ['nuxt', 'vue', 'vue-router'] },
    server: { fs: { allow: [resolve(import.meta.dirname, '../../..')] } },
  },
  nitro: { noExternals: [resolve(import.meta.dirname, '../../..')] },
  modules: [NuxtSiteConfig, NuxtSitemap],
  site: {
    url: 'https://nuxt5.example.com',
  },
  sitemap: {
    experimentalCompression: true,
    experimentalStreaming: true,
    credits: false,
    urls: ['/included'],
    sources: [['/api/source', { headers: { authorization: 'Bearer fixture' }, query: { locale: 'en' } }]],
  },
  routeRules: {
    '/excluded': {
      sitemap: false,
    },
  },
  compatibilityDate: '2026-10-06',
})
