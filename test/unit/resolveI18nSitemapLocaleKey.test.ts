import { describe, expect, it } from 'vitest'
import { resolveI18nSitemapLocaleKey } from '../../src/runtime/utils-pure'

describe('resolveI18nSitemapLocaleKey', () => {
  // issue #621: one locale `_sitemap` is a prefix of another (zh / zh-Hant)
  const prefixSharing = ['zh', 'zh-Hant']

  it('matches a default locale sitemap exactly', () => {
    expect(resolveI18nSitemapLocaleKey('zh', prefixSharing)).toBe('zh')
    expect(resolveI18nSitemapLocaleKey('zh-Hant', prefixSharing)).toBe('zh-Hant')
  })

  it('does not let a prefix-sharing locale steal another locale sitemap', () => {
    // `zh-Hant` must resolve to the `zh-Hant` locale, NOT `zh`
    expect(resolveI18nSitemapLocaleKey('zh-Hant', prefixSharing)).not.toBe('zh')
  })

  it('matches custom i18n sitemaps via longest locale key', () => {
    // `<localeSitemap>-<name>` naming
    expect(resolveI18nSitemapLocaleKey('zh-pages', prefixSharing)).toBe('zh')
    expect(resolveI18nSitemapLocaleKey('zh-Hant-pages', prefixSharing)).toBe('zh-Hant')
  })

  it('handles en / en-US prefix collisions', () => {
    const keys = ['en', 'en-US']
    expect(resolveI18nSitemapLocaleKey('en', keys)).toBe('en')
    expect(resolveI18nSitemapLocaleKey('en-US', keys)).toBe('en-US')
    expect(resolveI18nSitemapLocaleKey('en-posts', keys)).toBe('en')
    expect(resolveI18nSitemapLocaleKey('en-US-posts', keys)).toBe('en-US')
  })

  it('returns null when no locale key matches (non-i18n sitemap)', () => {
    expect(resolveI18nSitemapLocaleKey('custom', prefixSharing)).toBeNull()
  })
})
