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
})
