import { describe, expect, it } from 'vitest'
import { extractSitemapXMLFast } from '../../src/runtime/server/sitemap/utils/fast-xml-parser'

describe('fast XML parser', () => {
  it('should parse basic sitemap structure', () => {
    const xml = `
      <urlset>
        <url>
          <loc>https://example.com/page1</loc>
          <lastmod>2023-01-01</lastmod>
          <changefreq>daily</changefreq>
          <priority>0.8</priority>
        </url>
        <url>
          <loc>https://example.com/page2</loc>
          <lastmod>2023-01-02</lastmod>
        </url>
      </urlset>
    `

    const result = extractSitemapXMLFast(xml)

    expect(result).toEqual([
      {
        loc: 'https://example.com/page1',
        lastmod: '2023-01-01',
        changefreq: 'daily',
        priority: 0.8,
      },
      {
        loc: 'https://example.com/page2',
        lastmod: '2023-01-02',
      },
    ])
  })

  it('should handle images', () => {
    const xml = `
      <url>
        <loc>https://example.com/page</loc>
        <image:image>
          <image:loc>https://example.com/image1.jpg</image:loc>
        </image:image>
        <image:image>
          <image:loc>https://example.com/image2.jpg</image:loc>
        </image:image>
      </url>
    `

    const result = extractSitemapXMLFast(xml)

    expect(result[0]).toEqual({
      loc: 'https://example.com/page',
      images: [
        { loc: 'https://example.com/image1.jpg' },
        { loc: 'https://example.com/image2.jpg' },
      ],
    })
  })

  it('should handle missing or invalid URLs', () => {
    const xml = `
      <url>
        <lastmod>2023-01-01</lastmod>
      </url>
      <url>
        <loc>https://example.com/valid</loc>
      </url>
    `

    const result = extractSitemapXMLFast(xml)

    // Should only include the valid URL with loc
    expect(result).toEqual([
      { loc: 'https://example.com/valid' },
    ])
  })
})
