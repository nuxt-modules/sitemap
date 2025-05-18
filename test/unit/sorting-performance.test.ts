import { describe, expect, it } from 'vitest'
import { sortSitemapUrls } from '../../src/runtime/server/sitemap/urlset/sort'

describe('sorting performance features', () => {
  it('should sort URLs by segment count and then by locale', () => {
    const urls = [
      '/very/deep/path/here',
      '/page',
      '/about',
      '/services',
      '/deep/path',
      '/another/deep/path',
      '/page/1',
      '/page/10',
      '/page/2',
    ]

    const sorted = sortSitemapUrls(urls)

    expect(sorted).toEqual([
      '/about',
      '/page',
      '/services',
      '/deep/path',
      '/page/1',
      '/page/2',
      '/page/10',
      '/another/deep/path',
      '/very/deep/path/here',
    ])
  })

  it('should handle numeric sorting correctly', () => {
    const urls = [
      '/item-10',
      '/item-2',
      '/item-1',
      '/item-20',
      '/item-100',
    ]

    const sorted = sortSitemapUrls(urls)

    expect(sorted).toEqual([
      '/item-1',
      '/item-2',
      '/item-10',
      '/item-20',
      '/item-100',
    ])
  })

  it('should preserve original array instance for type safety', () => {
    const urls = ['/c', '/a', '/b']
    const sorted = sortSitemapUrls(urls)

    // Should return a new array with same type
    expect(sorted).not.toBe(urls)
    expect(sorted).toHaveLength(urls.length)
    expect(sorted).toEqual(['/a', '/b', '/c'])
  })
})
