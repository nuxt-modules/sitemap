import { describe, expect, it } from 'vitest'
import { normalizeLocales, splitPathForI18nLocales } from '../../src/util/i18n'
import type { AutoI18nConfig } from '../../src/runtime/types'
import { resolveSitemapEntries } from '../../src/runtime/nitro/sitemap/builder/sitemap'

const EnFrAutoI18n = {
  locales: normalizeLocales({ locales: [{
    code: 'en',
    iso: 'en-US',
  }, {
    code: 'fr',
    iso: 'fr-FR',
  }] }),
  defaultLocale: 'en',
  strategy: 'prefix_except_default',
} as AutoI18nConfig

describe('i18n', () => {
  it('filtering prefix_except_default', async () => {
    const data = splitPathForI18nLocales('/about', EnFrAutoI18n)
    expect(data).toMatchInlineSnapshot(`
      [
        "/about",
        "/fr/about",
      ]
    `)
    const data2 = splitPathForI18nLocales('/fr/about', EnFrAutoI18n)
    expect(data2).toMatchInlineSnapshot('"/fr/about"')
  })
  it('filtering prefix_and_default', async () => {
    const data = splitPathForI18nLocales('/about', { ...EnFrAutoI18n, strategy: 'prefix_and_default' })
    expect(data).toMatchInlineSnapshot(`
      [
        "/about",
        "/en/about",
        "/fr/about",
      ]
    `)
    const data2 = splitPathForI18nLocales('/fr/about', { ...EnFrAutoI18n, strategy: 'prefix_and_default' })
    expect(data2).toMatchInlineSnapshot('"/fr/about"')
    const data3 = splitPathForI18nLocales('/en/about', { ...EnFrAutoI18n, strategy: 'prefix_and_default' })
    expect(data3).toMatchInlineSnapshot('"/en/about"')
  })
  it('filtering prefix', async () => {
    const data = splitPathForI18nLocales('/about', { ...EnFrAutoI18n, strategy: 'prefix' })
    expect(data).toMatchInlineSnapshot(`
      [
        "/about",
        "/en/about",
        "/fr/about",
      ]
    `)
    const data2 = splitPathForI18nLocales('/fr/about', { ...EnFrAutoI18n, strategy: 'prefix' })
    expect(data2).toMatchInlineSnapshot('"/fr/about"')
  })
  it('_i18nTransform without prefix', () => {
    const urls = resolveSitemapEntries({
      sitemapName: 'sitemap.xml',
    }, [{
      urls: [
        {
          loc: '/__sitemap/url',
          changefreq: 'weekly',
          _i18nTransform: true,
        },
      ],
      context: {
        name: 'foo',
      },
      sourceType: 'user',
    }], {
      locales: EnFrAutoI18n.locales,
      defaultLocale: 'en',
      strategy: 'no_prefix',
      isI18nMapped: true,
    })
    expect(urls).toMatchInlineSnapshot(`
      [
        {
          "_abs": false,
          "_i18nTransform": true,
          "_key": "/__sitemap/url",
          "_path": {
            "hash": "",
            "pathname": "/__sitemap/url",
            "search": "",
          },
          "changefreq": "weekly",
          "loc": "/__sitemap/url",
        },
      ]
    `)
  })
  it('_i18nTransform prefix_except_default', () => {
    const urls = resolveSitemapEntries({
      sitemapName: 'sitemap.xml',
    }, [{
      urls: [
        {
          loc: '/__sitemap/url',
          changefreq: 'weekly',
          _i18nTransform: true,
        },
      ],
      context: {
        name: 'foo',
      },
      sourceType: 'user',
    }], {
      autoI18n: {
        locales: EnFrAutoI18n.locales,
        defaultLocale: 'en',
        strategy: 'prefix_except_default',
      },
      isI18nMapped: true,
    })
    expect(urls).toMatchInlineSnapshot(`
      [
        {
          "_abs": false,
          "_index": undefined,
          "_key": "en-US/__sitemap/url",
          "_locale": {
            "_hreflang": "en-US",
            "_sitemap": "en-US",
            "code": "en",
            "iso": "en-US",
            "language": "en-US",
          },
          "_path": {
            "hash": "",
            "pathname": "/__sitemap/url",
            "search": "",
          },
          "_pathWithoutPrefix": "/__sitemap/url",
          "_sitemap": "en-US",
          "alternatives": [
            {
              "href": "/__sitemap/url",
              "hreflang": "x-default",
            },
            {
              "href": "/__sitemap/url",
              "hreflang": "en-US",
            },
            {
              "href": "/fr/__sitemap/url",
              "hreflang": "fr-FR",
            },
          ],
          "changefreq": "weekly",
          "loc": "/__sitemap/url",
        },
        {
          "_abs": false,
          "_index": undefined,
          "_key": "fr-FR/fr/__sitemap/url",
          "_locale": {
            "_hreflang": "fr-FR",
            "_sitemap": "fr-FR",
            "code": "fr",
            "iso": "fr-FR",
            "language": "fr-FR",
          },
          "_path": {
            "hash": "",
            "pathname": "/fr/__sitemap/url",
            "search": "",
          },
          "_pathWithoutPrefix": "/__sitemap/url",
          "_sitemap": "fr-FR",
          "alternatives": [
            {
              "href": "/__sitemap/url",
              "hreflang": "x-default",
            },
            {
              "href": "/__sitemap/url",
              "hreflang": "en-US",
            },
            {
              "href": "/fr/__sitemap/url",
              "hreflang": "fr-FR",
            },
          ],
          "changefreq": "weekly",
          "loc": "/fr/__sitemap/url",
        },
      ]
    `)
  })
  it('applies alternative links', () => {
    const urls = resolveSitemapEntries({
      sitemapName: 'sitemap.xml',
    }, [{
      urls: [],
      context: {
        name: 'foo',
      },
      sourceType: 'user',
    }, {
      urls: [
        {
          loc: '/en/dynamic/foo',
        },
        {
          loc: '/fr/dynamic/foo',
        },
        {
          loc: 'endless-dungeon', // issue with en being picked up as the locale
          _i18nTransform: true,
        },
        {
          loc: 'english-url', // issue with en being picked up as the locale
        },
        // absolute URL issue
        { loc: 'https://www.somedomain.com/abc/def' },
      ],
      context: {
        name: 'foo',
      },
      sourceType: 'user',
    }], {
      autoI18n: EnFrAutoI18n,
      isI18nMapped: true,
    })
    expect(urls).toMatchInlineSnapshot(`
      [
        {
          "_abs": false,
          "_index": 0,
          "_key": "en-US/en/dynamic/foo",
          "_locale": {
            "_hreflang": "en-US",
            "_sitemap": "en-US",
            "code": "en",
            "iso": "en-US",
            "language": "en-US",
          },
          "_path": {
            "hash": "",
            "pathname": "/en/dynamic/foo",
            "search": "",
          },
          "_pathWithoutPrefix": "/dynamic/foo",
          "_sitemap": "en-US",
          "alternatives": [
            {
              "href": "/en/dynamic/foo",
              "hreflang": "x-default",
            },
            {
              "href": "/en/dynamic/foo",
              "hreflang": "en-US",
            },
            {
              "href": "/fr/dynamic/foo",
              "hreflang": "fr-FR",
            },
          ],
          "loc": "/en/dynamic/foo",
        },
        {
          "_abs": false,
          "_index": 1,
          "_key": "fr-FR/fr/dynamic/foo",
          "_locale": {
            "_hreflang": "fr-FR",
            "_sitemap": "fr-FR",
            "code": "fr",
            "iso": "fr-FR",
            "language": "fr-FR",
          },
          "_path": {
            "hash": "",
            "pathname": "/fr/dynamic/foo",
            "search": "",
          },
          "_pathWithoutPrefix": "/dynamic/foo",
          "_sitemap": "fr-FR",
          "alternatives": [
            {
              "href": "/en/dynamic/foo",
              "hreflang": "x-default",
            },
            {
              "href": "/en/dynamic/foo",
              "hreflang": "en-US",
            },
            {
              "href": "/fr/dynamic/foo",
              "hreflang": "fr-FR",
            },
          ],
          "loc": "/fr/dynamic/foo",
        },
        {
          "_abs": false,
          "_index": undefined,
          "_key": "en-USendless-dungeon",
          "_locale": {
            "_hreflang": "en-US",
            "_sitemap": "en-US",
            "code": "en",
            "iso": "en-US",
            "language": "en-US",
          },
          "_path": {
            "hash": "",
            "pathname": "endless-dungeon",
            "search": "",
          },
          "_pathWithoutPrefix": "endless-dungeon",
          "_sitemap": "en-US",
          "alternatives": [
            {
              "href": "endless-dungeon",
              "hreflang": "x-default",
            },
            {
              "href": "endless-dungeon",
              "hreflang": "en-US",
            },
            {
              "href": "/fr/endless-dungeon",
              "hreflang": "fr-FR",
            },
          ],
          "loc": "endless-dungeon",
        },
        {
          "_abs": false,
          "_index": 3,
          "_key": "en-USenglish-url",
          "_locale": {
            "_hreflang": "en-US",
            "_sitemap": "en-US",
            "code": "en",
            "iso": "en-US",
            "language": "en-US",
          },
          "_path": {
            "hash": "",
            "pathname": "english-url",
            "search": "",
          },
          "_pathWithoutPrefix": "english-url",
          "_sitemap": "en-US",
          "alternatives": [
            {
              "href": "english-url",
              "hreflang": "x-default",
            },
            {
              "href": "english-url",
              "hreflang": "en-US",
            },
          ],
          "loc": "english-url",
        },
        {
          "_abs": true,
          "_key": "/abc/def",
          "_path": {
            "auth": "",
            "hash": "",
            "host": "www.somedomain.com",
            "pathname": "/abc/def",
            "protocol": "https:",
            "search": "",
            Symbol(ufo:protocolRelative): false,
          },
          "loc": "https://www.somedomain.com/abc/def",
        },
        {
          "_abs": false,
          "_index": undefined,
          "_key": "fr-FR/fr/endless-dungeon",
          "_locale": {
            "_hreflang": "fr-FR",
            "_sitemap": "fr-FR",
            "code": "fr",
            "iso": "fr-FR",
            "language": "fr-FR",
          },
          "_path": {
            "hash": "",
            "pathname": "/fr/endless-dungeon",
            "search": "",
          },
          "_pathWithoutPrefix": "endless-dungeon",
          "_sitemap": "fr-FR",
          "alternatives": [
            {
              "href": "endless-dungeon",
              "hreflang": "x-default",
            },
            {
              "href": "endless-dungeon",
              "hreflang": "en-US",
            },
            {
              "href": "/fr/endless-dungeon",
              "hreflang": "fr-FR",
            },
          ],
          "loc": "/fr/endless-dungeon",
        },
      ]
    `)
  })
  it('normalizes locales', () => {
    const locales = [{
      code: 'en',
      iso: 'en-US',
    }, {
      code: 'fr',
      iso: 'fr-FR',
    }, {
      code: 'es',
    },
    'br',
    {
      code: 'xx',
      language: 'xx-XX',
    }]
    const data = normalizeLocales({ locales })
    expect(data).toMatchInlineSnapshot(`
      [
        {
          "_hreflang": "en-US",
          "_sitemap": "en-US",
          "code": "en",
          "iso": "en-US",
          "language": "en-US",
        },
        {
          "_hreflang": "fr-FR",
          "_sitemap": "fr-FR",
          "code": "fr",
          "iso": "fr-FR",
          "language": "fr-FR",
        },
        {
          "_hreflang": "es",
          "_sitemap": "es",
          "code": "es",
        },
        {
          "_hreflang": "br",
          "_sitemap": "br",
          "code": "br",
        },
        {
          "_hreflang": "xx-XX",
          "_sitemap": "xx-XX",
          "code": "xx",
          "language": "xx-XX",
        },
      ]
    `)
  })
})
