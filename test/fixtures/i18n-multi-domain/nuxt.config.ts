import NuxtSitemap from '../../../src/module'

const domains = ['english-brand.com', 'german-brand.de', 'italian-brand.it']

export default defineNuxtConfig({
  modules: [NuxtSitemap, '@nuxtjs/i18n'],
  compatibilityDate: '2024-07-22',
  site: {
    url: 'https://english-brand.com',
    multiTenancy: domains.map(host => ({ hosts: [host], config: { url: `https://${host}` } })),
  },
  i18n: {
    strategy: 'prefix_except_default',
    multiDomainLocales: true,
    detectBrowserLanguage: false,
    locales: ['en', 'de', 'it'].map((code, i) => ({
      code,
      language: code,
      domains,
      defaultForDomains: [domains[i]!],
    })),
  },
  sitemap: {
    autoLastmod: false,
    credits: false,
    urls: [{ loc: '/extra', _i18nTransform: true }],
    sitemaps: { pages: { includeAppSources: true } },
  },
})
