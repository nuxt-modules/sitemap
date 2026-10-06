import NuxtSiteConfig from 'nuxt-site-config'
import NuxtSitemap from '@nuxtjs/sitemap'

// Stable support excludes prereleases. This fixture enables only its pinned nightly.
for (const module of [NuxtSitemap, NuxtSiteConfig]) {
  const meta = await module.getMeta?.()
  if (!meta)
    throw new Error('Fixture module metadata unavailable')
  meta.compatibility = { ...meta.compatibility, nuxt: '^4.6.0 || ^5.0.0 || 5.0.0-2610052343-36eafab' }
}

export default defineNuxtConfig({
  modules: [NuxtSitemap],
  site: {
    url: 'https://nuxt5.example.com',
  },
  sitemap: {
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
