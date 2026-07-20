import { describe, expect, it } from 'vitest'
import { normaliseEntry, preNormalizeEntry } from '../../src/runtime/server/sitemap/urlset/normalise'

describe('normalise', () => {
  it('normalises without defaults without mutating the source entry', () => {
    const source = preNormalizeEntry({
      loc: '/page',
      lastmod: '2024-01-01T12:30:00',
      images: [{ loc: '/image.jpg' }],
    })
    const normalized = normaliseEntry(source)

    expect(normalized).not.toBe(source)
    expect(normalized.images).not.toBe(source.images)
    expect(normalized.lastmod).toBe('2024-01-01T12:30:00Z')
    expect(source.lastmod).toBe('2024-01-01T12:30:00')
  })

  it('reuses lastmod normalization while preserving valid and invalid results', () => {
    const cache = {}
    const valid = preNormalizeEntry({ loc: '/valid', lastmod: '2024-01-01T12:30:00' })
    const repeated = preNormalizeEntry({ loc: '/repeated', lastmod: '2024-01-01T12:30:00' })
    const invalid = preNormalizeEntry({ loc: '/invalid', lastmod: 'not-a-date' })
    const repeatedInvalid = preNormalizeEntry({ loc: '/repeated-invalid', lastmod: 'not-a-date' })

    expect(normaliseEntry(valid, undefined, undefined, cache).lastmod).toBe('2024-01-01T12:30:00Z')
    expect(normaliseEntry(repeated, undefined, undefined, cache).lastmod).toBe('2024-01-01T12:30:00Z')
    expect(normaliseEntry(invalid, undefined, undefined, cache).lastmod).toBeUndefined()
    expect(normaliseEntry(repeatedInvalid, undefined, undefined, cache).lastmod).toBeUndefined()
  })

  it('applies configured defaults', () => {
    const normalized = normaliseEntry(preNormalizeEntry('/page'), { changefreq: 'weekly', priority: 0.5 })
    expect(normalized.changefreq).toBe('weekly')
    expect(normalized.priority).toBe(0.5)
  })

  it('query', async () => {
    const normalisedWithoutSlash = preNormalizeEntry({ loc: '/query?foo=bar' })
    expect(normalisedWithoutSlash).toMatchInlineSnapshot(`
      {
        "_abs": false,
        "_key": "/query?foo=bar",
        "_path": {
          "hash": "",
          "pathname": "/query",
          "search": "?foo=bar",
        },
        "_relativeLoc": "/query?foo=bar",
        "loc": "/query?foo=bar",
      }
    `)
    const normalisedWithSlash = preNormalizeEntry({ loc: '/query/?foo=bar' })
    expect(normalisedWithSlash).toMatchInlineSnapshot(`
      {
        "_abs": false,
        "_key": "/query?foo=bar",
        "_path": {
          "hash": "",
          "pathname": "/query",
          "search": "?foo=bar",
        },
        "_relativeLoc": "/query?foo=bar",
        "loc": "/query?foo=bar",
      }
    `)
  })

  it('removes a trailing slash before query strings and fragments', () => {
    expect(preNormalizeEntry('/path/?foo=bar').loc).toBe('/path?foo=bar')
    expect(preNormalizeEntry('/path/#section').loc).toBe('/path')
    expect(preNormalizeEntry('/path/').loc).toBe('/path')
    expect(preNormalizeEntry('/').loc).toBe('/')
  })

  it('encoding', () => {
    const normalisedWithoutSlash = preNormalizeEntry({ loc: '/this/is a test' })
    expect(normalisedWithoutSlash).toMatchInlineSnapshot(`
      {
        "_abs": false,
        "_key": "/this/is%20a%20test",
        "_path": {
          "hash": "",
          "pathname": "/this/is a test",
          "search": "",
        },
        "_relativeLoc": "/this/is%20a%20test",
        "loc": "/this/is%20a%20test",
      }
    `)
    const withQuery = preNormalizeEntry({ loc: '/this/is a test?withAQuery=foo' })
    expect(withQuery).toMatchInlineSnapshot(`
      {
        "_abs": false,
        "_key": "/this/is%20a%20test?withAQuery=foo",
        "_path": {
          "hash": "",
          "pathname": "/this/is a test",
          "search": "?withAQuery=foo",
        },
        "_relativeLoc": "/this/is%20a%20test?withAQuery=foo",
        "loc": "/this/is%20a%20test?withAQuery=foo",
      }
    `)
    const withQueryWeird = preNormalizeEntry({ loc: '/this/is a test?with A some weirdformat=foo' })
    expect(withQueryWeird).toMatchInlineSnapshot(`
      {
        "_abs": false,
        "_key": "/this/is%20a%20test?with+A+some+weirdformat=foo",
        "_path": {
          "hash": "",
          "pathname": "/this/is a test",
          "search": "?with A some weirdformat=foo",
        },
        "_relativeLoc": "/this/is%20a%20test?with+A+some+weirdformat=foo",
        "loc": "/this/is%20a%20test?with+A+some+weirdformat=foo",
      }
    `)
  })

  it('_encoded: true preserves pre-encoded URLs', () => {
    // Test reserved characters - user pre-encoded with encodeURIComponent
    const reservedChars = preNormalizeEntry({ loc: '/%24-%3A%29', _encoded: true })
    expect(reservedChars.loc).toBe('/%24-%3A%29')

    // Test pre-encoded emoji stays intact
    const emoji = preNormalizeEntry({ loc: '/%F0%9F%98%85', _encoded: true })
    expect(emoji.loc).toBe('/%F0%9F%98%85')

    // Test unencoded URL stays as-is when _encoded: true (user's responsibility)
    const unencoded = preNormalizeEntry({ loc: '/😅', _encoded: true })
    expect(unencoded.loc).toBe('/😅')
  })

  it('default encoding behavior', () => {
    // Emoji should be encoded
    const emoji = preNormalizeEntry({ loc: '/😅' })
    expect(emoji.loc).toBe('/%F0%9F%98%85')

    // Space should be encoded
    const space = preNormalizeEntry({ loc: '/hello world' })
    expect(space.loc).toBe('/hello%20world')

    // Reserved chars like $ and : are NOT encoded by encodePath (per RFC-3986)
    const reserved = preNormalizeEntry({ loc: '/$-:)' })
    expect(reserved.loc).toBe('/$-:)')
  })
})
