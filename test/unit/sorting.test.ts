import { describe, expect, it } from 'vitest'
import { sortInPlace } from '../../src/runtime/server/sitemap/urlset/sort'

describe('sorting', () => {
  it('default', async () => {
    const data = sortInPlace([
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
