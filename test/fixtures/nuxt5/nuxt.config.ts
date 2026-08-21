import NuxtSitemap from '@nuxtjs/sitemap'

export default defineNuxtConfig({
  modules: [NuxtSitemap],
  // nitro 3.0.260610-beta rebuilds the server bundle after prerendering for static
  // presets and fails with "rolldownOptions.input should not be an html file"
  // (nitrojs/nitro#4509 fixes it, unreleased). Use the nuxt build pipeline instead.
  experimental: {
    nitroViteEnvironment: false,
  },
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
