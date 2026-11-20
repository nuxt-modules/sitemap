import { describe, expect, it, vi } from 'vitest'
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

  it('preserves segment-first natural ordering for objects and strings', () => {
    const input = [
      '/products/20',
      '/products',
      '/products/3',
      '/about/team',
      '/about',
      '/products/11/reviews',
      '/products/2/reviews',
    ]
    const expected = [...input].sort((a, b) => {
      const segmentDifference = a.split('/').length - b.split('/').length
      return segmentDifference || a.localeCompare(b, undefined, { numeric: true })
    })

    expect(sortInPlace([...input])).toEqual(expected)
    expect(sortInPlace(input.map(loc => ({ loc }))).map(entry => entry.loc)).toEqual(expected)
  })

  it('creates the collator only when two paths have the same depth', async () => {
    vi.resetModules()
    const collator = vi.spyOn(Intl, 'Collator')
    try {
      const { sortInPlace } = await import('../../src/runtime/server/sitemap/urlset/sort')

      expect(sortInPlace(['/products/10', '/products'])).toEqual(['/products', '/products/10'])
      expect(collator).not.toHaveBeenCalled()

      expect(sortInPlace(['/products/10', '/products/2'])).toEqual(['/products/2', '/products/10'])
      expect(sortInPlace(['/products/3', '/products/1'])).toEqual(['/products/1', '/products/3'])
      expect(collator).toHaveBeenCalledTimes(1)
    }
    finally {
      collator.mockRestore()
    }
  })
})
