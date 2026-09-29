import NuxtSitemap from '../../../src/module'

// https://github.com/nuxt-modules/sitemap/issues/675
// Pages are prerendered (routes + crawlLinks) but the site URL is only known at
// runtime. Prerendering the sitemap at build time must not happen: there is no
// build-time site URL, so it errors. `zeroPrerender` opts out entirely.
export default defineNuxtConfig({
  modules: [NuxtSitemap],

  compatibilityDate: '2025-01-15',

  nitro: {
    prerender: {
      crawlLinks: true,
      routes: ['/'],
    },
  },

  sitemap: {
    autoLastmod: false,
    credits: false,
    zeroPrerender: true,
  },
})
