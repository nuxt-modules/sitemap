import NuxtSitemap from '@nuxtjs/sitemap'

export default defineNuxtConfig({
  future: { compatibilityVersion: process.env.NUXT_TEST_FUTURE === '5' ? 5 : 4 },
  modules: [NuxtSitemap],
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
