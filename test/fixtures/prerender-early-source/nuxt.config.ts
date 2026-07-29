import NuxtSitemap from '../../../src/module'

export default defineNuxtConfig({
  modules: [NuxtSitemap],
  site: {
    url: 'https://example.com',
  },
  nitro: {
    prerender: {
      routes: ['/early-sitemap'],
    },
  },
  sitemap: {
    credits: false,
    excludeAppSources: true,
    urls: ['/configured'],
    zeroRuntime: true,
  },
})
