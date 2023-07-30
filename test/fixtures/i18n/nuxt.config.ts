import NuxtSimpleSitemap from '../../../src/module'

// https://v3.nuxtjs.org/api/configuration/nuxt.config
export default defineNuxtConfig({
  modules: [
    NuxtSimpleSitemap,
    '@nuxtjs/i18n',
  ],
  sitemap: {
    autoLastmod: false,
    credits: false,
    debug: true,
  },
  site: {
    url: 'https://nuxtseo.com',
  },
  sitemap: {
    autoAlternativeLangPrefixes: true,
    autoLastmod: false,
    credits: false,
    debug: true,
  },
  i18n: {
    baseUrl: '',
    detectBrowserLanguage: false,
    defaultLocale: 'en',
    vueI18n: './nuxt-i18n.ts',
  },
})
