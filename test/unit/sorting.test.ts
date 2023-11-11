import { describe, expect, it } from 'vitest'
import { sortSitemapUrls } from '../../src/runtime/sitemap/urlset/sort'

describe('sorting', () => {
  it('default', async () => {
    const data = sortSitemapUrls([
      { loc: '/a' },
      { loc: '/b' },
      { loc: '/c' },
      { loc: '/1' },
      { loc: '/2' },
      { loc: '/10' },
    ])
    expect(data).toMatchInlineSnapshot(`
      [
        {
          "loc": "/1",
        },
        {
          "loc": "/2",
        },
        {
          "loc": "/10",
        },
        {
          "loc": "/a",
        },
        {
          "loc": "/b",
        },
        {
          "loc": "/c",
        },
      ]
    `)
  })
})
