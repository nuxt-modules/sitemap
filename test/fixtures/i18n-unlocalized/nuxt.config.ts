import NuxtSitemap from '../../../src/module'

const hosts = ['english-brand.com', 'german-brand.de']

export default defineNuxtConfig({
  modules: [NuxtSitemap, '@nuxtjs/i18n'],
  compatibilityDate: '2024-07-22',
  site: {
    url: `https://${hosts[0]}`,
    multiTenancy: hosts.map(host => ({ hosts: [host], config: { url: `https://${host}` } })),
  },
  i18n: {
    defaultLocale: 'en',
    strategy: 'prefix_except_default',
    multiDomainLocales: true,
    detectBrowserLanguage: false,
    locales: ['en', 'de'].map((code, i) => ({ code, domains: [hosts[i]!], defaultForDomains: [hosts[i]!] })),
  },
  sitemap: { sitemaps: { pages: { includeAppSources: true } } },
})
