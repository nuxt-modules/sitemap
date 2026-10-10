import { resolve } from 'node:path'
import NuxtSeoShared from 'nuxtseo-shared'
import NuxtSiteConfig from 'nuxt-site-config'
import NuxtSitemap from '@nuxtjs/sitemap'

// Stable support excludes prereleases. This fixture enables only its pinned nightly.
for (const module of [NuxtSitemap, NuxtSiteConfig, NuxtSeoShared]) {
  const meta = await module.getMeta?.()
  if (!meta)
    throw new Error('Fixture module metadata unavailable')
  meta.compatibility = { ...meta.compatibility, nuxt: '^4.6.0 || ^5.0.0 || 5.0.0-2610061032-c7ad8cd' }
}

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
