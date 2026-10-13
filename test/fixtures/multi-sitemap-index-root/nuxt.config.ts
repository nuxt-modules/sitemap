import NuxtSitemap from '../../../src/module'

export default defineNuxtConfig({
  modules: [NuxtSitemap],
  site: {
    url: 'https://example.com',
  },
  nitro: {
    prerender: {
      crawlLinks: true,
      routes: ['/'],
    },
  },
  sitemap: {
    autoLastmod: false,
    credits: false,
    excludeAppSources: true,
    sitemaps: {
      pages: {
        urls: ['/'],
      },
      posts: {
        urls: ['/posts/hello'],
      },
    },
  },
})
