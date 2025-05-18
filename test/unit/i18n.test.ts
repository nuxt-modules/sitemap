import { describe, expect, it } from 'vitest'
import { normalizeLocales, splitPathForI18nLocales } from '../../src/util/i18n'
import type { AutoI18nConfig } from '../../src/runtime/types'

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
    // @ts-expect-error untyped
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
