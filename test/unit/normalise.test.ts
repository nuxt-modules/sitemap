import { describe, expect, it } from 'vitest'
import { preNormalizeEntry } from '../../src/runtime/server/sitemap/urlset/normalise'

describe('normalise', () => {
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
