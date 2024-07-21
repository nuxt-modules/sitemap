import { describe, expect, it } from 'vitest'
import { preNormalizeEntry } from '../../src/runtime/nitro/sitemap/urlset/normalise'

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
        "loc": "/query?foo=bar",
      }
    `)
  })
})
