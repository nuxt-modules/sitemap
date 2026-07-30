import { describe, expect, it } from 'vitest'
import {
  isSitemapIndex,
  parseSitemapIndex,
  parseSitemapIndexStream,
  parseSitemapStream,
  parseSitemapXml,
  parseSitemapXmlStream,
} from '../../src/utils'

async function collect<T>(source: AsyncIterable<T>): Promise<T[]> {
  const values: T[] = []
  for await (const value of source)
    values.push(value)
  return values
}

describe('legacy parser compatibility', () => {
  it('restores the @nuxtjs/sitemap/utils parser exports', async () => {
    const xml = '<urlset><url><loc>https://example.com/</loc><priority>0.7</priority></url></urlset>'

    await expect(parseSitemapXml(xml)).resolves.toEqual({
      urls: [{ loc: 'https://example.com/', priority: 0.7 }],
      warnings: [],
    })
    await expect(collect(parseSitemapXmlStream(xml))).resolves.toEqual([
      { _tag: 'url', url: { loc: 'https://example.com/', priority: 0.7 } },
    ])
    await expect(collect(parseSitemapStream(xml))).resolves.toEqual([
      { _tag: 'kind', kind: 'urlset' },
      { _tag: 'url', url: { loc: 'https://example.com/', priority: 0.7 } },
    ])
  })

  it('restores sitemap index parsing', async () => {
    const xml = '<sitemapindex><sitemap><loc>https://example.com/a.xml</loc></sitemap></sitemapindex>'

    expect(isSitemapIndex(xml)).toBe(true)
    await expect(parseSitemapIndex(xml)).resolves.toEqual({
      entries: [{ loc: 'https://example.com/a.xml' }],
      warnings: [],
    })
    await expect(collect(parseSitemapIndexStream(xml))).resolves.toEqual([
      { _tag: 'sitemap', sitemap: { loc: 'https://example.com/a.xml' } },
    ])
  })

  it('preserves parser specific errors', async () => {
    await expect(parseSitemapXml('<other />')).rejects.toThrow('XML does not contain a valid urlset element')
    await expect(parseSitemapIndex('<other />')).rejects.toThrow('XML does not contain a valid sitemapindex element')
  })
})
