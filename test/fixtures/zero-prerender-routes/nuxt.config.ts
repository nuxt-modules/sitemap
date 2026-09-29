import NuxtSitemap from '../../../src/module'

// https://github.com/nuxt-modules/sitemap/issues/677
// The sitemap route is listed in nitro.prerender.routes and no pages are crawled
// (no `crawlLinks`). `zeroPrerender` must still filter the sitemap out of
// prerendering: otherwise nitro prerenders the sitemap handler, which fails the
// build because there is no build-time site URL.
export default defineNuxtConfig({
  modules: [NuxtSitemap],

  compatibilityDate: '2025-01-15',

  nitro: {
    prerender: {
      routes: ['/', '/sitemap.xml'],
    },
  },

  sitemap: {
    autoLastmod: false,
    credits: false,
    zeroPrerender: true,
  },
})
