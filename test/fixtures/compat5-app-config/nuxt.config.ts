import NuxtSitemap from '../../../src/module'

export default defineNuxtConfig({
  modules: [NuxtSitemap],
  future: {
    compatibilityVersion: 5,
  },
  // The repository `.nuxtrc` turns auto-imports off; app.config.ts relies on them.
  imports: {
    autoImport: true,
  },
  site: {
    url: 'https://example.com',
  },
  nitro: {
    prerender: {
      routes: ['/', '/theme.json', '/sitemap.xml'],
    },
  },
  sitemap: {
    credits: false,
    autoLastmod: false,
  },
})
