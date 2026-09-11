import type { AutoI18nConfig, NitroUrlResolvers } from '../../src/runtime/types'
import { describe, expect, it } from 'vitest'
import { resolveSitemapEntries } from '../../src/runtime/server/sitemap/builder/entries'
import { convertNuxtPagesToSitemapEntries } from '../../src/utils-internal/nuxtSitemap'

const domains = ['english-brand.com', 'german-brand.de', 'italian-brand.it']
const autoI18n: AutoI18nConfig = {
  defaultLocale: 'en',
  strategy: 'prefix_except_default',
  multiDomainLocales: true,
  locales: ['en', 'de', 'it'].map((code, i) => ({ code, _hreflang: code, _sitemap: code, domains, defaultForDomains: [domains[i]!] })),
}
const resolvers = {
  canonicalUrlResolver: (path: string) => new URL(path, 'https://english-brand.com').href,
  fixSlashes: (path: string) => path,
} as NitroUrlResolvers

function appRoutes(config: AutoI18nConfig) {
  return convertNuxtPagesToSitemapEntries([
    { name: 'about___en___default', path: '/about' },
    ...['en', 'de', 'it'].map(code => ({ name: `about___${code}`, path: `/${code}/about` })),
  ], {
    normalisedLocales: config.locales,
    multiDomainLocales: config.multiDomainLocales,
    defaultLocale: config.defaultLocale,
    strategy: config.strategy,
    autoI18n: true,
    autoLastmod: false,
    isI18nMapped: true,
    filter: {},
  })
}

describe('request domain sitemap entries', () => {
  it('preserves supplied remote alternatives and x-default', () => {
    const alternatives = [
      { hreflang: 'en', href: 'https://english-brand.com/about' },
      { hreflang: 'de', href: 'https://german-brand.de/ueber' },
      { hreflang: 'x-default', href: 'https://select-brand.com/' },
    ]
    const entries = resolveSitemapEntries({ sitemapName: 'sitemap.xml' }, [{ loc: '/about', alternatives }], { autoI18n, isI18nMapped: true }, resolvers)
    expect(entries[0]?.alternatives).toEqual(alternatives)
  })

  it('preserves alternatives replaced by a sitemap input hook', () => {
    const alternatives = [{ hreflang: 'de', href: 'https://german-brand.de/ueber' }, { hreflang: 'x-default', href: 'https://select-brand.com/' }]
    const inputs = appRoutes(autoI18n).map(entry => typeof entry === 'string' ? { loc: entry, alternatives } : ({ ...entry, alternatives }))
    const entries = resolveSitemapEntries({ sitemapName: 'sitemap.xml' }, inputs, { autoI18n, isI18nMapped: true }, resolvers)
    for (const entry of entries)
      expect(entry.alternatives).toEqual(alternatives)
  })

  it('preserves generated alternatives edited by a sitemap input hook', () => {
    const inputs = appRoutes(autoI18n).map(entry => typeof entry === 'string'
      ? entry
      : ({
          ...entry,
          alternatives: entry.alternatives?.map(alternative => ({ ...alternative, href: alternative.hreflang === 'x-default' ? 'https://select-brand.com/' : alternative.href })),
        }))
    const entries = resolveSitemapEntries({ sitemapName: 'sitemap.xml' }, inputs, { autoI18n, isI18nMapped: true }, resolvers)
    for (const entry of entries)
      expect(entry.alternatives).toContainEqual(expect.objectContaining({ hreflang: 'x-default', href: 'https://select-brand.com/' }))
  })

  it('preserves generated alternative languages edited by a sitemap input hook', () => {
    const inputs = appRoutes(autoI18n).map(entry => typeof entry === 'string'
      ? entry
      : ({ ...entry, alternatives: entry.alternatives?.filter(alternative => alternative.hreflang === 'en' && alternative.href === '/about').map(alternative => ({ ...alternative, hreflang: 'de' })) }))
    const entries = resolveSitemapEntries({ sitemapName: 'sitemap.xml' }, inputs, { autoI18n, isI18nMapped: true }, resolvers)
    for (const entry of entries)
      expect(entry.alternatives).toContainEqual(expect.objectContaining({ hreflang: 'de', href: '/about' }))
  })

  it('keeps locale-like ordinary sitemap names', () => {
    const entries = resolveSitemapEntries({ sitemapName: 'sitemap.xml' }, [{ loc: '/de/about', _sitemap: 'en-news' }], { autoI18n, isI18nMapped: false }, resolvers)
    expect(entries.map(e => ({ loc: e.loc, sitemap: e._sitemap }))).toEqual([{ loc: 'https://english-brand.com/de/about', sitemap: 'en-news' }])
  })

  it.each(['transformed', 'restricted source', 'app routes'])('excludes unavailable locales from %s', (source) => {
    const config = { ...autoI18n, locales: autoI18n.locales.map(l => l.code === 'it' ? { ...l, domains: ['italian-brand.it'] } : l) }
    const inputs = source === 'app routes' ? appRoutes(config) : [{ loc: source === 'restricted source' ? '/it/extra' : '/extra', _i18nTransform: true }]
    const entries = resolveSitemapEntries({ sitemapName: 'sitemap.xml' }, inputs, { autoI18n: config, isI18nMapped: true }, resolvers)
    expect(entries.map(e => e.loc).sort()).toEqual(source !== 'app routes'
      ? ['https://english-brand.com/de/extra', 'https://english-brand.com/extra']
      : ['https://english-brand.com/about', 'https://english-brand.com/de/about'])
    for (const entry of entries) {
      expect(entry.alternatives?.map(a => a.hreflang).sort()).toEqual(['de', 'en', 'x-default'])
    }
  })

  it('does not infer unavailable alternatives from transformation seeds', () => {
    const config = { ...autoI18n, locales: autoI18n.locales.map(l => l.code === 'it' ? { ...l, domains: ['italian-brand.it'] } : l) }
    const entries = resolveSitemapEntries({ sitemapName: 'sitemap.xml' }, ['/extra', { loc: '/it/extra', _i18nTransform: true }], { autoI18n: config, isI18nMapped: true }, resolvers)
    for (const entry of entries)
      expect(entry.alternatives?.some(a => a.hreflang === 'it')).toBe(false)
  })

  it('omits transformed pages available only on another domain', () => {
    const config: AutoI18nConfig = {
      ...autoI18n,
      locales: autoI18n.locales.map(l => l.code === 'it' ? { ...l, domains: ['italian-brand.it'] } : l),
      pages: { about: { en: false, de: false, it: '/informazioni' } },
    }
    const entries = resolveSitemapEntries({ sitemapName: 'sitemap.xml' }, [{ loc: '/it/informazioni', _i18nTransform: true }], { autoI18n: config, isI18nMapped: true }, resolvers)
    expect(entries).toEqual([])
  })

  it('keeps both generated default route variants', () => {
    const config: AutoI18nConfig = { ...autoI18n, strategy: 'prefix_and_default' }
    const entries = resolveSitemapEntries({ sitemapName: 'sitemap.xml' }, appRoutes(config), { autoI18n: config, isI18nMapped: true }, resolvers)
    expect(entries.map(e => e.loc).sort()).toEqual(['/about', '/de/about', '/en/about', '/it/about'].map(path => `https://english-brand.com${path}`))
  })

  it.each(['en', 'de'])('keeps both default custom page variants for %s', (defaultLocale) => {
    const config: AutoI18nConfig = { ...autoI18n, defaultLocale, strategy: 'prefix_and_default', pages: { about: { en: '/about', de: '/ueber', it: '/informazioni' } } }
    const entries = resolveSitemapEntries({ sitemapName: 'sitemap.xml' }, [{ loc: '/en/about', _i18nTransform: true }], { autoI18n: config, isI18nMapped: true }, resolvers)
    expect(entries.map(e => e.loc).sort()).toEqual((defaultLocale === 'en'
      ? ['/about', '/en/about', '/de/ueber', '/it/informazioni']
      : ['/ueber', '/en/about', '/de/ueber', '/it/informazioni']).map(path => `https://english-brand.com${path}`).sort())
  })
})
