import NuxtSitemap from '../../../src/module'

// https://v3.nuxtjs.org/api/configuration/nuxt.config
export default defineNuxtConfig({
  modules: [
    NuxtSitemap,
    '@nuxt/content',
  ],
  site: {
    url: 'https://nuxtseo.com',
  },
  alias: {
    '@nuxt/content': '@nuxt/content-v2',
  },
  debug: process.env.NODE_ENV === 'test',
  sitemap: {
    autoLastmod: false,
    credits: false,
    debug: true,
  },
})
