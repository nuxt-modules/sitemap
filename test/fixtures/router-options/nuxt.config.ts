import Sitemap from '../../../src/module'

export default defineNuxtConfig({
  modules: [Sitemap],
  site: { url: 'https://example.com' },
  router: { options: { sensitive: false, strict: false } },
  nitro: { prerender: { crawlLinks: false, routes: ['/HIDDEN', '/hidden/', '/hidden-alias', '/nested/private', '/nested/alias', '/other/private', '/'] } },
  sitemap: { autoLastmod: false },
})
