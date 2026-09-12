import NuxtSitemap from '../../../src/module'

export default defineNuxtConfig({
  modules: [NuxtSitemap, '@nuxtjs/i18n'],
  compatibilityDate: '2024-07-22',
  site: { url: 'https://english-brand.com' },
  i18n: {
    strategy: 'prefix_except_default',
    multiDomainLocales: true,
    detectBrowserLanguage: false,
    locales: [
      { code: 'en', language: 'en', domains: ['english-brand.com'], defaultForDomains: ['english-brand.com'] },
      { code: 'de', language: 'de', domains: [] },
    ],
  },
  sitemap: { sitemaps: { pages: { includeAppSources: true } } },
})
