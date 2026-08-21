import NuxtSitemap from '../../../src/module'

export default defineNuxtConfig({
  modules: [
    NuxtSitemap,
    '@harlan-zw/comark-content',
  ],

  site: {
    url: 'https://nuxtseo.com',
  },
  compatibilityDate: '2024-12-06',

  sitemap: {
    autoLastmod: false,
    credits: false,
    debug: true,
  },
})
