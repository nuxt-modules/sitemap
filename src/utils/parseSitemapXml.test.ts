import { describe, it, expect } from 'vitest'
import { parseSitemapXml } from './parseSitemapXml'

describe('parseSitemapXml', () => {
  it('should extract loc, lastmod, changefreq, priority, images, videos, alternatives, and news from XML', async () => {
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
    const result = await parseSitemapXml(xml)
    expect(result.urls).toMatchInlineSnapshot(`
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

  it('should handle missing optional fields', async () => {
    const xml = `
      <urlset>
        <url>
          <loc>http://example.com/</loc>
          <lastmod>2023-01-01</lastmod>
          <changefreq>daily</changefreq>
        </url>
      </urlset>
    `
    const result = await parseSitemapXml(xml)
    expect(result.urls).toMatchInlineSnapshot(`
      [
        {
          "changefreq": "daily",
          "lastmod": "2023-01-01",
          "loc": "http://example.com/",
        },
      ]
    `)
  })

  it('should handle multiple images and videos', async () => {
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
    const result = await parseSitemapXml(xml)
    expect(result.urls).toMatchInlineSnapshot(`
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

  it('should handle missing loc, lastmod, and changefreq', async () => {
    const xml = `
      <urlset>
        <url>
          <image:image>
            <image:loc>http://example.com/image1.jpg</image:loc>
          </image:image>
        </url>
      </urlset>
    `
    const result = await parseSitemapXml(xml)
    expect(result.urls).toMatchInlineSnapshot(`[]`)
  })

  it('should throw error if no URLs are found', async () => {
    const xml = '<urlset></urlset>'
    await expect(() => parseSitemapXml(xml)).rejects.toThrow('XML does not contain a valid urlset element')
  })

  it('should handle malformed XML', async () => {
    const xml = `
      <urlset>
        <url>
          <ldoc>http://example.com/
          <lastmod>2023-01-01</lastmod>
          <changefreq>daily</changefreq>
        </url>
      </urlset>
    `
    const result = await parseSitemapXml(xml)
    expect(result.urls).toMatchInlineSnapshot(`[]`)
  })

  it('should handle XML with unexpected tags', async () => {
    const xml = `
      <urlset>
        <url>
          <loc>http://example.com/</loc>
          <unexpectedTag>unexpectedValue</unexpectedTag>
        </url>
      </urlset>
    `
    const result = await parseSitemapXml(xml)
    expect(result.urls).toMatchInlineSnapshot(`
      [
        {
          "loc": "http://example.com/",
        },
      ]
    `)
  })

  describe('malformed XML and edge cases', () => {
    it('should throw error for completely invalid XML', async () => {
      const xml = 'not xml at all'
      await expect(() => parseSitemapXml(xml)).rejects.toThrow('XML does not contain a valid urlset element')
    })

    it('should throw error for XML with invalid structure', async () => {
      const xml = '<invalid><structure>'
      await expect(() => parseSitemapXml(xml)).rejects.toThrow('XML does not contain a valid urlset element')
    })

    it('should throw error for XML without urlset', async () => {
      const xml = '<root><other>content</other></root>'
      await expect(() => parseSitemapXml(xml)).rejects.toThrow('XML does not contain a valid urlset element')
    })

    it('should throw error for empty XML', async () => {
      const xml = ''
      await expect(() => parseSitemapXml(xml)).rejects.toThrow('Empty XML input provided')
    })

    it('should handle XML with unclosed tags', async () => {
      const xml = `
        <urlset>
          <url>
            <loc>http://example.com/
            <lastmod>2023-01-01</lastmod>
          </url>
        </urlset>
      `
      const result = await parseSitemapXml(xml)
      expect(result.urls).toEqual([])
    })

    it('should handle XML with CDATA sections', async () => {
      const xml = `
        <urlset>
          <url>
            <loc><![CDATA[http://example.com/special&chars]]></loc>
            <lastmod>2023-01-01</lastmod>
          </url>
        </urlset>
      `
      const result = await parseSitemapXml(xml)
      expect(result.urls).toMatchInlineSnapshot(`
        [
          {
            "lastmod": "2023-01-01",
            "loc": "http://example.com/special&chars",
          },
        ]
      `)
    })

    it('should handle XML with HTML entities', async () => {
      const xml = `
        <urlset>
          <url>
            <loc>http://example.com/path?param1=value&amp;param2=value</loc>
            <lastmod>2023-01-01</lastmod>
          </url>
        </urlset>
      `
      const result = await parseSitemapXml(xml)
      expect(result.urls).toMatchInlineSnapshot(`
        [
          {
            "lastmod": "2023-01-01",
            "loc": "http://example.com/path?param1=value&param2=value",
          },
        ]
      `)
    })
  })

  describe('XML namespace handling', () => {
    it('should handle mixed namespace prefixes', async () => {
      const xml = `
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
                xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
                xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
          <url>
            <loc>http://example.com/</loc>
            <image:image>
              <image:loc>http://example.com/image.jpg</image:loc>
            </image:image>
            <video:video>
              <video:title>Test Video</video:title>
              <video:thumbnail_loc>http://example.com/thumb.jpg</video:thumbnail_loc>
              <video:description>Test Description</video:description>
              <video:content_loc>http://example.com/video.mp4</video:content_loc>
            </video:video>
          </url>
        </urlset>
      `
      const result = await parseSitemapXml(xml)
      expect(result.urls[0]).toMatchObject({
        loc: 'http://example.com/',
        images: [{ loc: 'http://example.com/image.jpg' }],
        videos: [{
          title: 'Test Video',
          thumbnail_loc: 'http://example.com/thumb.jpg',
          description: 'Test Description',
          content_loc: 'http://example.com/video.mp4',
        }],
      })
    })

    it('should handle different namespace prefixes', async () => {
      const xml = `
        <sitemap:urlset xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
                        xmlns:img="http://www.google.com/schemas/sitemap-image/1.1">
          <sitemap:url>
            <sitemap:loc>http://example.com/</sitemap:loc>
            <img:image>
              <img:loc>http://example.com/image.jpg</img:loc>
            </img:image>
          </sitemap:url>
        </sitemap:urlset>
      `
      const result = await parseSitemapXml(xml)
      expect(result.urls).toMatchInlineSnapshot(`
        [
          {
            "images": [
              {
                "loc": "http://example.com/image.jpg",
              },
            ],
            "loc": "http://example.com/",
          },
        ]
      `)
    })
  })

  describe('complex video attributes and nested elements', () => {
    it('should handle video with all optional attributes', async () => {
      const xml = `
        <urlset>
          <url>
            <loc>http://example.com/</loc>
            <video:video>
              <video:title>Complete Video</video:title>
              <video:thumbnail_loc>http://example.com/thumb.jpg</video:thumbnail_loc>
              <video:description>Complete description</video:description>
              <video:content_loc>http://example.com/video.mp4</video:content_loc>
              <video:player_loc>http://example.com/player</video:player_loc>
              <video:duration>3600</video:duration>
              <video:expiration_date>2024-12-31</video:expiration_date>
              <video:rating>4.5</video:rating>
              <video:view_count>10000</video:view_count>
              <video:publication_date>2023-01-01</video:publication_date>
              <video:family_friendly>yes</video:family_friendly>
              <video:requires_subscription>no</video:requires_subscription>
              <video:live>no</video:live>
              <video:tag>action</video:tag>
              <video:tag>adventure</video:tag>
            </video:video>
          </url>
        </urlset>
      `
      const result = await parseSitemapXml(xml)
      expect(result.urls[0].videos[0]).toMatchObject({
        title: 'Complete Video',
        thumbnail_loc: 'http://example.com/thumb.jpg',
        description: 'Complete description',
        content_loc: 'http://example.com/video.mp4',
        player_loc: 'http://example.com/player',
        duration: 3600,
        expiration_date: '2024-12-31',
        rating: 4.5,
        view_count: 10000,
        publication_date: '2023-01-01',
        family_friendly: 'yes',
        requires_subscription: 'no',
        live: 'no',
        tag: ['action', 'adventure'],
      })
    })

    it('should handle video with restrictions and platform attributes', async () => {
      const xml = `
        <urlset>
          <url>
            <loc>http://example.com/</loc>
            <video:video>
              <video:title>Restricted Video</video:title>
              <video:thumbnail_loc>http://example.com/thumb.jpg</video:thumbnail_loc>
              <video:description>Restricted content</video:description>
              <video:content_loc>http://example.com/video.mp4</video:content_loc>
              <video:restriction>
                <video:relationship>allow</video:relationship>
                US CA
              </video:restriction>
              <video:platform>
                <video:relationship>deny</video:relationship>
                mobile
              </video:platform>
            </video:video>
          </url>
        </urlset>
      `
      const result = await parseSitemapXml(xml)
      expect(result.urls[0].videos[0]).toMatchObject({
        title: 'Restricted Video',
        restriction: {
          relationship: 'allow',
          restriction: 'US CA',
        },
        platform: {
          relationship: 'deny',
          platform: 'mobile',
        },
      })
    })

    it('should handle video with price information', async () => {
      const xml = `
        <urlset>
          <url>
            <loc>http://example.com/</loc>
            <video:video>
              <video:title>Paid Video</video:title>
              <video:thumbnail_loc>http://example.com/thumb.jpg</video:thumbnail_loc>
              <video:description>Premium content</video:description>
              <video:content_loc>http://example.com/video.mp4</video:content_loc>
              <video:price>
                <video:currency>USD</video:currency>
                <video:type>rent</video:type>
                3.99
              </video:price>
              <video:price>
                <video:currency>USD</video:currency>
                <video:type>purchase</video:type>
                9.99
              </video:price>
            </video:video>
          </url>
        </urlset>
      `
      const result = await parseSitemapXml(xml)
      expect(result.urls[0].videos[0].price).toEqual([
        { price: '3.99', currency: 'USD', type: 'rent' },
        { price: '9.99', currency: 'USD', type: 'purchase' },
      ])
    })

    it('should handle video with uploader information', async () => {
      const xml = `
        <urlset>
          <url>
            <loc>http://example.com/</loc>
            <video:video>
              <video:title>User Video</video:title>
              <video:thumbnail_loc>http://example.com/thumb.jpg</video:thumbnail_loc>
              <video:description>User generated content</video:description>
              <video:content_loc>http://example.com/video.mp4</video:content_loc>
              <video:uploader>
                <video:info>http://example.com/user</video:info>
                John Doe
              </video:uploader>
            </video:video>
          </url>
        </urlset>
      `
      const result = await parseSitemapXml(xml)
      expect(result.urls[0].videos[0].uploader).toEqual({
        uploader: 'John Doe',
        info: 'http://example.com/user',
      })
    })

    it('should filter out invalid videos missing required fields', async () => {
      const xml = `
        <urlset>
          <url>
            <loc>http://example.com/</loc>
            <video:video>
              <video:title>Incomplete Video 1</video:title>
              <!-- Missing thumbnail_loc, description, and content_loc -->
            </video:video>
            <video:video>
              <video:title>Complete Video</video:title>
              <video:thumbnail_loc>http://example.com/thumb.jpg</video:thumbnail_loc>
              <video:description>Complete description</video:description>
              <video:content_loc>http://example.com/video.mp4</video:content_loc>
            </video:video>
            <video:video>
              <video:thumbnail_loc>http://example.com/thumb2.jpg</video:thumbnail_loc>
              <video:description>Missing title</video:description>
              <video:content_loc>http://example.com/video2.mp4</video:content_loc>
            </video:video>
          </url>
        </urlset>
      `
      const result = await parseSitemapXml(xml)
      expect(result.urls[0].videos).toHaveLength(1)
      expect(result.urls[0].videos[0].title).toBe('Complete Video')
    })
  })

  describe('empty and null values', () => {
    it('should handle empty values gracefully', async () => {
      const xml = `
        <urlset>
          <url>
            <loc>http://example.com/</loc>
            <lastmod></lastmod>
            <changefreq></changefreq>
            <priority></priority>
          </url>
        </urlset>
      `
      const result = await parseSitemapXml(xml)
      expect(result.urls).toMatchInlineSnapshot(`
        [
          {
            "loc": "http://example.com/",
          },
        ]
      `)
    })

    it('should handle whitespace-only values', async () => {
      const xml = `
        <urlset>
          <url>
            <loc>   http://example.com/   </loc>
            <lastmod>  </lastmod>
            <changefreq>   </changefreq>
          </url>
        </urlset>
      `
      const result = await parseSitemapXml(xml)
      expect(result.urls[0].loc).toBe('http://example.com/') // trimValues is true so whitespace is trimmed
      expect(result.urls[0]).not.toHaveProperty('lastmod')
      expect(result.urls[0]).not.toHaveProperty('changefreq')
    })

    it('should handle multiple URLs with mixed validity', async () => {
      const xml = `
        <urlset>
          <url>
            <loc>http://example.com/1</loc>
            <lastmod>2023-01-01</lastmod>
          </url>
          <url>
            <!-- Missing loc -->
            <lastmod>2023-01-02</lastmod>
          </url>
          <url>
            <loc>http://example.com/3</loc>
            <priority>0.5</priority>
          </url>
          <url>
            <loc></loc>
            <lastmod>2023-01-04</lastmod>
          </url>
        </urlset>
      `
      const result = await parseSitemapXml(xml)
      expect(result.urls).toHaveLength(2)
      expect(result.urls[0].loc).toBe('http://example.com/1')
      expect(result.urls[1].loc).toBe('http://example.com/3')
    })

    it('should handle special characters in URLs', async () => {
      const xml = `
        <urlset>
          <url>
            <loc>http://example.com/path with spaces</loc>
            <lastmod>2023-01-01</lastmod>
          </url>
          <url>
            <loc>http://example.com/中文路径</loc>
            <lastmod>2023-01-02</lastmod>
          </url>
          <url>
            <loc>http://example.com/émoji-🚀-path</loc>
            <lastmod>2023-01-03</lastmod>
          </url>
        </urlset>
      `
      const result = await parseSitemapXml(xml)
      expect(result.urls).toHaveLength(3)
      expect(result.urls[0].loc).toBe('http://example.com/path with spaces')
      expect(result.urls[1].loc).toBe('http://example.com/中文路径')
      expect(result.urls[2].loc).toBe('http://example.com/émoji-🚀-path')
    })

    it('should handle images without loc', async () => {
      const xml = `
        <urlset>
          <url>
            <loc>http://example.com/</loc>
            <image:image>
              <image:loc>http://example.com/valid.jpg</image:loc>
            </image:image>
            <image:image>
              <!-- Missing image:loc -->
            </image:image>
            <image:image>
              <image:loc></image:loc>
            </image:image>
          </url>
        </urlset>
      `
      const result = await parseSitemapXml(xml)
      expect(result.urls[0].images).toHaveLength(1)
      expect(result.urls[0].images[0].loc).toBe('http://example.com/valid.jpg')
    })

    it('should handle news with missing required fields', async () => {
      const xml = `
        <urlset>
          <url>
            <loc>http://example.com/</loc>
            <news:news>
              <news:title>Valid News</news:title>
              <news:publication_date>2023-01-01</news:publication_date>
              <news:publication>
                <news:name>Example News</news:name>
                <news:language>en</news:language>
              </news:publication>
            </news:news>
          </url>
          <url>
            <loc>http://example.com/2</loc>
            <news:news>
              <!-- Missing required fields -->
              <news:title>Incomplete News</news:title>
            </news:news>
          </url>
        </urlset>
      `
      const result = await parseSitemapXml(xml)
      expect(result.urls[0]).toHaveProperty('news')
      expect(result.urls[1]).not.toHaveProperty('news')
    })
  })

  describe('priority and changefreq edge cases', () => {
    it('should handle various priority formats', async () => {
      const xml = `
        <urlset>
          <url>
            <loc>http://example.com/1</loc>
            <priority>0.0</priority>
          </url>
          <url>
            <loc>http://example.com/2</loc>
            <priority>1.0</priority>
          </url>
          <url>
            <loc>http://example.com/3</loc>
            <priority>0.5</priority>
          </url>
          <url>
            <loc>http://example.com/4</loc>
            <priority>invalid</priority>
          </url>
        </urlset>
      `
      const result = await parseSitemapXml(xml)
      expect(result.urls[0].priority).toBe(0.0)
      expect(result.urls[1].priority).toBe(1.0)
      expect(result.urls[2].priority).toBe(0.5)
      expect(result.urls[3]).not.toHaveProperty('priority') // Invalid priority is filtered out
    })

    it('should handle all valid changefreq values', async () => {
      const frequencies = ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never']
      const xml = `
        <urlset>
          ${frequencies.map((freq, i) => `
            <url>
              <loc>http://example.com/${i}</loc>
              <changefreq>${freq}</changefreq>
            </url>
          `).join('')}
        </urlset>
      `
      const result = await parseSitemapXml(xml)
      frequencies.forEach((freq, i) => {
        expect(result.urls[i].changefreq).toBe(freq)
      })
    })
  })

  describe('alternatives handling', () => {
    it('should handle multiple alternatives with different hreflang values', async () => {
      const xml = `
        <urlset>
          <url>
            <loc>http://example.com/</loc>
            <xhtml:link>
              <xhtml:rel>alternate</xhtml:rel>
              <xhtml:hreflang>en</xhtml:hreflang>
              <xhtml:href>http://example.com/en</xhtml:href>
            </xhtml:link>
            <xhtml:link>
              <xhtml:rel>alternate</xhtml:rel>
              <xhtml:hreflang>fr</xhtml:hreflang>
              <xhtml:href>http://example.com/fr</xhtml:href>
            </xhtml:link>
            <xhtml:link>
              <xhtml:rel>alternate</xhtml:rel>
              <xhtml:hreflang>es</xhtml:hreflang>
              <xhtml:href>http://example.com/es</xhtml:href>
            </xhtml:link>
            <xhtml:link>
              <xhtml:rel>alternate</xhtml:rel>
              <xhtml:hreflang>x-default</xhtml:hreflang>
              <xhtml:href>http://example.com/</xhtml:href>
            </xhtml:link>
          </url>
        </urlset>
      `
      const result = await parseSitemapXml(xml)
      expect(result.urls[0].alternatives).toHaveLength(4)
      expect(result.urls[0].alternatives).toEqual([
        { hreflang: 'en', href: 'http://example.com/en' },
        { hreflang: 'fr', href: 'http://example.com/fr' },
        { hreflang: 'es', href: 'http://example.com/es' },
        { hreflang: 'x-default', href: 'http://example.com/' },
      ])
    })

    it('should filter out invalid alternative links', async () => {
      const xml = `
        <urlset>
          <url>
            <loc>http://example.com/</loc>
            <xhtml:link rel="alternate" hreflang="en" href="http://example.com/en" />
            <xhtml:link rel="canonical" href="http://example.com/" />
            <xhtml:link rel="alternate" href="http://example.com/missing-hreflang" />
            <xhtml:link rel="alternate" hreflang="fr" />
          </url>
        </urlset>
      `
      const result = await parseSitemapXml(xml)
      expect(result.urls[0].alternatives).toHaveLength(1)
      expect(result.urls[0].alternatives[0]).toEqual({ hreflang: 'en', href: 'http://example.com/en' })
    })
  })

  describe('parseSitemapXml with warnings', () => {
    it('should throw error for invalid XML', async () => {
      const xml = 'not xml at all'
      await expect(() => parseSitemapXml(xml)).rejects.toThrow('XML does not contain a valid urlset element')
    })

    it('should throw error for empty XML', async () => {
      const xml = ''
      await expect(() => parseSitemapXml(xml)).rejects.toThrow('Empty XML input provided')
    })

    it('should throw error for XML without urlset', async () => {
      const xml = '<root><other>content</other></root>'
      await expect(() => parseSitemapXml(xml)).rejects.toThrow('XML does not contain a valid urlset element')
    })

    it('should throw error for sitemap with no URL entries', async () => {
      const xml = '<urlset></urlset>'
      await expect(() => parseSitemapXml(xml)).rejects.toThrow('XML does not contain a valid urlset element')
    })

    it('should return warnings for URLs missing loc', async () => {
      const xml = `
        <urlset>
          <url>
            <lastmod>2023-01-01</lastmod>
          </url>
        </urlset>
      `
      const result = await parseSitemapXml(xml)
      expect(result.urls).toEqual([])
      expect(result.warnings).toHaveLength(2)
      expect(result.warnings[0].type).toBe('validation')
      expect(result.warnings[0].message).toBe('URL entry missing required loc element')
      expect(result.warnings[1].message).toBe('No valid URLs found in sitemap after validation')
    })

    it('should return warnings for invalid changefreq values', async () => {
      const xml = `
        <urlset>
          <url>
            <loc>http://example.com/</loc>
            <changefreq>invalid</changefreq>
          </url>
        </urlset>
      `
      const result = await parseSitemapXml(xml)
      expect(result.urls).toHaveLength(1)
      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0].type).toBe('validation')
      expect(result.warnings[0].message).toBe('Invalid changefreq value')
      expect(result.warnings[0].context?.field).toBe('changefreq')
    })

    it('should return warnings for out-of-range priority values', async () => {
      const xml = `
        <urlset>
          <url>
            <loc>http://example.com/</loc>
            <priority>1.5</priority>
          </url>
        </urlset>
      `
      const result = await parseSitemapXml(xml)
      expect(result.urls).toHaveLength(1)
      expect(result.urls[0].priority).toBe(1.0) // clamped
      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0].type).toBe('validation')
      expect(result.warnings[0].message).toBe('Priority value should be between 0.0 and 1.0, clamping to valid range')
    })

    it('should return warnings for videos missing required fields', async () => {
      const xml = `
        <urlset>
          <url>
            <loc>http://example.com/</loc>
            <video:video>
              <video:title>Incomplete Video</video:title>
              <!-- Missing required fields -->
            </video:video>
          </url>
        </urlset>
      `
      const result = await parseSitemapXml(xml)
      expect(result.urls).toHaveLength(1)
      expect(result.urls[0]).not.toHaveProperty('videos')
      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0].type).toBe('validation')
      expect(result.warnings[0].message).toContain('Video missing required fields')
    })

    it('should return warnings for invalid video rating values', async () => {
      const xml = `
        <urlset>
          <url>
            <loc>http://example.com/</loc>
            <video:video>
              <video:title>Test Video</video:title>
              <video:thumbnail_loc>http://example.com/thumb.jpg</video:thumbnail_loc>
              <video:description>Test Description</video:description>
              <video:content_loc>http://example.com/video.mp4</video:content_loc>
              <video:rating>10</video:rating>
            </video:video>
          </url>
        </urlset>
      `
      const result = await parseSitemapXml(xml)
      expect(result.urls).toHaveLength(1)
      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0].type).toBe('validation')
      expect(result.warnings[0].message).toBe('Video rating should be between 0.0 and 5.0')
    })

    it('should return warnings for invalid video family_friendly values', async () => {
      const xml = `
        <urlset>
          <url>
            <loc>http://example.com/</loc>
            <video:video>
              <video:title>Test Video</video:title>
              <video:thumbnail_loc>http://example.com/thumb.jpg</video:thumbnail_loc>
              <video:description>Test Description</video:description>
              <video:content_loc>http://example.com/video.mp4</video:content_loc>
              <video:family_friendly>maybe</video:family_friendly>
            </video:video>
          </url>
        </urlset>
      `
      const result = await parseSitemapXml(xml)
      expect(result.urls).toHaveLength(1)
      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0].type).toBe('validation')
      expect(result.warnings[0].message).toBe('Invalid video family_friendly value, should be "yes" or "no"')
    })

    it('should return warnings for news entries missing required fields', async () => {
      const xml = `
        <urlset>
          <url>
            <loc>http://example.com/</loc>
            <news:news>
              <news:title>Incomplete News</news:title>
              <!-- Missing publication_date and publication -->
            </news:news>
          </url>
        </urlset>
      `
      const result = await parseSitemapXml(xml)
      expect(result.urls).toHaveLength(1)
      expect(result.urls[0]).not.toHaveProperty('news')
      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0].type).toBe('validation')
      expect(result.warnings[0].message).toContain('News entry missing required fields')
    })

    it('should collect multiple warnings for different issues', async () => {
      const xml = `
        <urlset>
          <url>
            <loc>http://example.com/1</loc>
            <changefreq>invalid</changefreq>
            <priority>2.0</priority>
          </url>
          <url>
            <!-- Missing loc -->
            <lastmod>2023-01-01</lastmod>
          </url>
          <url>
            <loc>http://example.com/3</loc>
            <video:video>
              <video:title>Incomplete Video</video:title>
              <!-- Missing required video fields -->
            </video:video>
          </url>
        </urlset>
      `
      const result = await parseSitemapXml(xml)
      expect(result.urls).toHaveLength(2) // Only valid URLs
      expect(result.warnings.length).toBeGreaterThan(3) // Multiple warnings

      const warningTypes = result.warnings.map(w => w.type)
      expect(warningTypes).toContain('validation')
    })
  })
})
