import NuxtSitemap from '../../../src/module'

// https://v3.nuxtjs.org/api/configuration/nuxt.config
export default defineNuxtConfig({
  modules: [
    NuxtSitemap,
  ],
  site: {
    url: 'https://nuxtseo.com',
  },
  sitemap: {
    dynamicUrlsApiEndpoint: '/__sitemap',
    autoLastmod: false,
    credits: false,
    debug: true,
  },
})
