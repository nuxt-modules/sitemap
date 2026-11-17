import { defineNuxtConfig } from 'nuxt/config'

// The node typecheck covers consumers configuring sitemap rules on Nuxt 5.
defineNuxtConfig({
  routeRules: {
    '/included': { sitemap: { priority: 0.3, changefreq: 'yearly' } },
    '/excluded': { sitemap: false },
  },
  nitro: {
    routeRules: {
      '/nitro-included': { sitemap: { priority: 0.7 } },
      '/nitro-excluded': { sitemap: false },
    },
  },
})

defineNuxtConfig({
  routeRules: {
    '/invalid': {
      // @ts-expect-error Sitemap rules accept defaults or false, never a string.
      sitemap: 'excluded',
    },
  },
})
