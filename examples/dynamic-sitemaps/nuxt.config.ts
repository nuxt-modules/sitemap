export default defineNuxtConfig({
  modules: ['@nuxtjs/sitemap'],

  site: {
    url: 'https://example.com',
  },

  compatibilityDate: '2025-01-01',

  sitemap: {
    sitemaps: {
      staticPages: {
        urls: ['/', '/about'],
        excludeAppSources: true,
      },
    },
    cacheMaxAgeSeconds: 60 * 60 * 24,
  },
})
