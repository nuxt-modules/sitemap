import { describe, it, expect } from 'vitest'
import { extractSitemapXML } from '../../src/runtime/server/sitemap/utils/extractSitemapXML'

describe('extractSitemapXML', () => {
  it('should extract loc, lastmod, changefreq, priority, images, videos, alternatives, and news from XML', () => {
    const xml = `
      <urlset>
        <url>
          <loc>http://example.com/</loc>
          <lastmod>2023-01-01</lastmod>
          <changefreq>daily</changefreq>
          <priority>0.8</priority>
          <image:image>
            <image:loc>http://example.com/image1.jpg</image:loc>
          </image:image>
          <video:video>
            <video:title>Example Video</video:title>
            <video:thumbnail_loc>http://example.com/thumbnail.jpg</video:thumbnail_loc>
            <video:description>Example Description</video:description>
            <video:content_loc>http://example.com/video1.mp4</video:content_loc>
            <video:duration>600</video:duration>
          </video:video>
          <xhtml:link rel="alternate" hreflang="en" href="http://example.com/en"/>
          <news:news>
            <news:title>Example News</news:title>
            <news:publication_date>2023-01-01</news:publication_date>
            <news:publication>
              <news:name>Example Publication</news:name>
              <news:language>en</news:language>
            </news:publication>
          </news:news>
        </url>
      </urlset>
    `
    const result = extractSitemapXML(xml)
    expect(result).toMatchInlineSnapshot(`
      [
        {
          "alternatives": [
            {
              "href": "http://example.com/en",
              "hreflang": "en",
            },
          ],
          "changefreq": "daily",
          "images": [
            {
              "loc": "http://example.com/image1.jpg",
            },
          ],
          "lastmod": "2023-01-01",
          "loc": "http://example.com/",
          "news": {
            "publication": {
              "language": "en",
              "name": "Example Publication",
            },
            "publication_date": "2023-01-01",
            "title": "Example News",
          },
          "priority": 0.8,
          "videos": [
            {
              "content_loc": "http://example.com/video1.mp4",
              "description": "Example Description",
              "duration": 600,
              "thumbnail_loc": "http://example.com/thumbnail.jpg",
              "title": "Example Video",
            },
          ],
        },
      ]
    `)
  })

  it('should handle missing optional fields', () => {
    const xml = `
      <urlset>
        <url>
          <loc>http://example.com/</loc>
          <lastmod>2023-01-01</lastmod>
          <changefreq>daily</changefreq>
        </url>
      </urlset>
    `
    const result = extractSitemapXML(xml)
    expect(result).toMatchInlineSnapshot(`
      [
        {
          "changefreq": "daily",
          "lastmod": "2023-01-01",
          "loc": "http://example.com/",
        },
      ]
    `)
  })

  it('should handle multiple images and videos', () => {
    const xml = `
      <urlset>
        <url>
          <loc>http://example.com/</loc>
          <image:image>
            <image:loc>http://example.com/image1.jpg</image:loc>
          </image:image>
          <image:image>
            <image:loc>http://example.com/image2.jpg</image:loc>
          </image:image>
          <video:video>
            <video:title>Example Video 1</video:title>
            <video:thumbnail_loc>http://example.com/thumbnail1.jpg</video:thumbnail_loc>
            <video:description>Example Description 1</video:description>
            <video:content_loc>http://example.com/video1.mp4</video:content_loc>
          </video:video>
          <video:video>
            <video:title>Example Video 2</video:title>
            <video:thumbnail_loc>http://example.com/thumbnail2.jpg</video:thumbnail_loc>
            <video:description>Example Description 2</video:description>
            <video:content_loc>http://example.com/video2.mp4</video:content_loc>
          </video:video>
        </url>
      </urlset>
    `
    const result = extractSitemapXML(xml)
    expect(result).toMatchInlineSnapshot(`
      [
        {
          "images": [
            {
              "loc": "http://example.com/image1.jpg",
            },
            {
              "loc": "http://example.com/image2.jpg",
            },
          ],
          "loc": "http://example.com/",
          "videos": [
            {
              "content_loc": "http://example.com/video1.mp4",
              "description": "Example Description 1",
              "thumbnail_loc": "http://example.com/thumbnail1.jpg",
              "title": "Example Video 1",
            },
            {
              "content_loc": "http://example.com/video2.mp4",
              "description": "Example Description 2",
              "thumbnail_loc": "http://example.com/thumbnail2.jpg",
              "title": "Example Video 2",
            },
          ],
        },
      ]
    `)
  })

  it('should handle missing loc, lastmod, and changefreq', () => {
    const xml = `
      <urlset>
        <url>
          <image:image>
            <image:loc>http://example.com/image1.jpg</image:loc>
          </image:image>
        </url>
      </urlset>
    `
    const result = extractSitemapXML(xml)
    expect(result).toMatchInlineSnapshot(`[]`)
  })

  it('should return an empty array if no URLs are found', () => {
    const xml = '<urlset></urlset>'
    const result = extractSitemapXML(xml)
    expect(result).toMatchInlineSnapshot(`[]`)
  })

  it('should handle malformed XML', () => {
    const xml = `
      <urlset>
        <url>
          <ldoc>http://example.com/
          <lastmod>2023-01-01</lastmod>
          <changefreq>daily</changefreq>
        </url>
      </urlset>
    `
    const result = extractSitemapXML(xml)
    expect(result).toMatchInlineSnapshot(`[]`)
  })

  it('should handle XML with unexpected tags', () => {
    const xml = `
      <urlset>
        <url>
          <loc>http://example.com/</loc>
          <unexpectedTag>unexpectedValue</unexpectedTag>
        </url>
      </urlset>
    `
    const result = extractSitemapXML(xml)
    expect(result).toMatchInlineSnapshot(`
      [
        {
          "loc": "http://example.com/",
        },
      ]
    `)
  })
})
