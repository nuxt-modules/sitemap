import { gzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { decodeSitemapResponseBytes } from '../../src/runtime/server/sitemap/urlset/gzip'

describe('decodeSitemapResponseBytes', () => {
  it('decompresses a gzip-compressed sitemap body (as served from a .xml.gz source)', async () => {
    const xml = '<?xml version="1.0" encoding="UTF-8"?><urlset><url><loc>https://example.com/</loc></url></urlset>'
    const compressed = new Uint8Array(gzipSync(Buffer.from(xml, 'utf-8')))

    const result = await decodeSitemapResponseBytes(compressed)
    expect(result).toBe(xml)
  })

  it('decompresses a gzip body served without a .gz extension (detected via magic bytes)', async () => {
    // Some servers serve a gzip-compressed body for a plain .xml URL without setting
    // Content-Encoding; the only signal is the 1f 8b magic bytes at the start.
    const xml = '<?xml version="1.0" encoding="UTF-8"?><urlset><url><loc>https://example.com/a</loc></url></urlset>'
    const compressed = new Uint8Array(gzipSync(Buffer.from(xml, 'utf-8')))

    const result = await decodeSitemapResponseBytes(compressed)
    expect(result).toBe(xml)
  })

  it('passes plain-text XML through untouched', async () => {
    const xml = '<?xml version="1.0" encoding="UTF-8"?><urlset><url><loc>https://example.com/</loc></url></urlset>'
    const bytes = new TextEncoder().encode(xml)

    const result = await decodeSitemapResponseBytes(bytes)
    expect(result).toBe(xml)
  })

  it('passes through empty input without throwing', async () => {
    const result = await decodeSitemapResponseBytes(new Uint8Array())
    expect(result).toBe('')
  })
})
