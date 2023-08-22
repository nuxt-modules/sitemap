import NuxtSimpleSitemap from '../../../src/module'

// https://v3.nuxtjs.org/api/configuration/nuxt.config
export default defineNuxtConfig({
  modules: [
    NuxtSimpleSitemap,
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
