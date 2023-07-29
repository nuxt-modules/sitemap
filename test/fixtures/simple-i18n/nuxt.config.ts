import NuxtSimpleSitemap from '../../../src/module'

// https://v3.nuxtjs.org/api/configuration/nuxt.config
export default defineNuxtConfig({
  modules: [
    [
      NuxtSimpleSitemap,
      {
        siteUrl: 'https://example.com',
        defaults: {
          changefreq: 'weekly',
          lastmod: new Date(),
        },
        autoAlternativeLangPrefixes: true,
        exclude: ['/lp/**'],
      },
    ],
    '@nuxtjs/i18n',
  ],
  i18n: {
    baseUrl: '',
    langDir: 'locales/',
    locales: [
      {
        code: 'es',
        iso: 'hr-HR',
        file: 'hr.ts',
      },
      {
        code: 'ca',
        iso: 'en-US',
        file: 'en.ts',
      },
      {
        code: 'en',
        iso: 'en-US',
        file: 'en.ts',
      },
    ],
    strategy: 'prefix_and_default',
    detectBrowserLanguage: false,
    defaultLocale: 'en',
    vueI18n: './nuxt-i18n.ts',
  },
})
