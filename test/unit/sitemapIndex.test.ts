import { describe, expect, it } from 'vitest'
import { isSitemapIndex, parseSitemapIndex } from '../../src/utils'

describe('isSitemapIndex', () => {
  it('detects sitemap index with opening tag', () => {
    expect(isSitemapIndex('<sitemapindex>')).toBe(true)
  })

  it('detects sitemap index with namespace', () => {
    expect(isSitemapIndex('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')).toBe(true)
  })

  it('detects sitemap index with closing tag only', () => {
    expect(isSitemapIndex('</sitemapindex>')).toBe(true)
  })

  it('returns false for urlset sitemap', () => {
    expect(isSitemapIndex('<urlset><url><loc>https://example.com</loc></url></urlset>')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isSitemapIndex('')).toBe(false)
  })
})

describe('parseSitemapIndex', () => {
  it('parses basic sitemap index', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://example.com/sitemap-1.xml</loc>
  </sitemap>
  <sitemap>
    <loc>https://example.com/sitemap-2.xml</loc>
  </sitemap>
</sitemapindex>`

    const { entries, warnings } = parseSitemapIndex(xml)
    expect(entries).toEqual([
      { loc: 'https://example.com/sitemap-1.xml' },
      { loc: 'https://example.com/sitemap-2.xml' },
    ])
    expect(warnings).toEqual([])
  })

  it('parses sitemap index with lastmod', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://example.com/sitemap-1.xml</loc>
    <lastmod>2024-01-15</lastmod>
  </sitemap>
</sitemapindex>`

    const { entries, warnings } = parseSitemapIndex(xml)
    expect(entries).toEqual([
      { loc: 'https://example.com/sitemap-1.xml', lastmod: '2024-01-15' },
    ])
    expect(warnings).toEqual([])
  })

  it('handles single sitemap entry', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://example.com/sitemap.xml</loc>
  </sitemap>
</sitemapindex>`

    const { entries } = parseSitemapIndex(xml)
    expect(entries).toHaveLength(1)
    expect(entries[0].loc).toBe('https://example.com/sitemap.xml')
  })

  it('returns empty array for empty sitemapindex', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</sitemapindex>`

    const { entries, warnings } = parseSitemapIndex(xml)
    expect(entries).toEqual([])
    expect(warnings).toEqual([])
  })

  it('warns on entries without loc', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <lastmod>2024-01-15</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://example.com/valid.xml</loc>
  </sitemap>
</sitemapindex>`

    const { entries, warnings } = parseSitemapIndex(xml)
    expect(entries).toEqual([
      { loc: 'https://example.com/valid.xml' },
    ])
    expect(warnings).toHaveLength(1)
    expect(warnings[0].message).toBe('Sitemap entry missing required loc element')
  })

  it('warns on invalid URLs', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>not-a-url</loc>
  </sitemap>
  <sitemap>
    <loc>https://example.com/valid.xml</loc>
  </sitemap>
</sitemapindex>`

    const { entries, warnings } = parseSitemapIndex(xml)
    expect(entries).toEqual([
      { loc: 'https://example.com/valid.xml' },
    ])
    expect(warnings).toHaveLength(1)
    expect(warnings[0].message).toBe('Sitemap entry has invalid URL')
    expect(warnings[0].context?.url).toBe('not-a-url')
  })

  it('trims whitespace from values', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>  https://example.com/sitemap.xml  </loc>
    <lastmod>  2024-01-15  </lastmod>
  </sitemap>
</sitemapindex>`

    const { entries } = parseSitemapIndex(xml)
    expect(entries[0].loc).toBe('https://example.com/sitemap.xml')
    expect(entries[0].lastmod).toBe('2024-01-15')
  })

  it('throws on empty input', () => {
    expect(() => parseSitemapIndex('')).toThrow('Empty XML input provided')
  })

  it('throws on non-sitemapindex XML', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://example.com</loc></url>
</urlset>`

    expect(() => parseSitemapIndex(xml)).toThrow('XML does not contain a valid sitemapindex element')
  })
})
