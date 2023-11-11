import { describe, expect, it } from 'vitest'
import { applyI18nEnhancements } from '../../src/runtime/sitemap/urlset/i18n'

describe('i18n', () => {
  it('prefix', async () => {
    const urls = applyI18nEnhancements([
      { loc: '/' },
    ], {
      strategy: 'prefix',
      defaultLocale: 'en',
      locales: [
        { code: 'en', iso: 'en_AU' },
        { code: 'fr', iso: 'fr_FR' },
      ],
    })
    expect(urls).toMatchInlineSnapshot(`
      [
        {
          "loc": "/",
        },
      ]
    `)
  })
  it('alternatives merging', async () => {
    const urls = applyI18nEnhancements([
      { loc: '/' },
    ], {
      strategy: 'prefix_except_default',
      defaultLocale: 'en',
      locales: [
        { code: 'en', iso: 'en_AU' },
        { code: 'fr', iso: 'fr_FR' },
      ],
    })
    expect(urls).toMatchInlineSnapshot(`
      [
        {
          "loc": "/",
        },
      ]
    `)
  })
})
