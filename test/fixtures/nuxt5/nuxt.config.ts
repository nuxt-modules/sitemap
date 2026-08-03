import NuxtSitemap from '@nuxtjs/sitemap'

export default defineNuxtConfig({
  modules: [NuxtSitemap],
  site: {
    url: 'https://nuxt5.example.com',
  },
  sitemap: {
    credits: false,
    urls: ['/included'],
  },
  routeRules: {
    '/excluded': {
      sitemap: false,
    },
  },
  compatibilityDate: '2026-06-10',
})
