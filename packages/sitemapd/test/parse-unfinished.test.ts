import { describe, expect, it } from 'vitest'
import { collectSitemap } from '../src/parse'

// Regression guard for unfinished markup that was re-scanned on every chunk.
// An unclosed `<!--`, `<?`, `<![CDATA[` or start tag was only bounded by
// maxDecodedBytes (50MB), not maxEntryBytes, so every decoded chunk searched
// the whole buffer again. A ~50KB gzip body took ~15s. Unfinished markup now
// stops at maxEntryBytes like an unclosed record does, and finished
// whitespace, comments and processing instructions leave the buffer at once.
// Small limits keep these tests light; bytesRead tells fixed from unfixed.

const MiB = 1024 * 1024

function* chunked(prefix: string, filler: string, totalBytes: number, chunkBytes = 4096): Generator<string> {
  yield prefix
  // whole repeats only, so a filler such as `<!---->` is never cut in two
  const chunk = filler.repeat(Math.ceil(chunkBytes / filler.length))
  for (let sent = prefix.length; sent < totalBytes; sent += chunk.length)
    yield chunk
}

function messages(result: Awaited<ReturnType<typeof collectSitemap>>): string {
  return result.issues.map(issue => issue.message).join('\n')
}

describe('unfinished markup', () => {
  it.each([
    ['comment after the root', '<urlset><!--'],
    ['processing instruction after the root', '<urlset><?pi '],
    ['comment before the root', '<!--'],
    ['root start tag', '<urlset '],
    ['record start tag', '<urlset><url '],
    ['RSS container comment', '<rss><!--'],
    ['feed metadata comment', '<feed><title><!--'],
    ['feed metadata CDATA', '<feed><title><![CDATA['],
  ])('stops an unclosed %s at maxEntryBytes', async (_label, prefix) => {
    const result = await collectSitemap(chunked(prefix, 'a', 2 * MiB), { maxEntryBytes: 64 * 1024 })

    expect(result._tag).toBe('failure')
    expect(messages(result)).toMatch(/exceeds 65536 bytes/)
    // Before the fix the whole body was read and re-scanned per chunk.
    expect(result.summary.bytesRead).toBeLessThan(256 * 1024)
  }, 120_000)

  it('stops a text sitemap line with no newline at maxEntryBytes', async () => {
    const result = await collectSitemap(chunked('https://example.com/', 'a', 2 * MiB), { formatHint: 'text', maxEntryBytes: 64 * 1024 })

    expect(result._tag).toBe('failure')
    expect(messages(result)).toMatch(/exceeds 65536 bytes/)
    expect(result.summary.bytesRead).toBeLessThan(256 * 1024)
  }, 120_000)

  it('stops an unclosed comment at the default maxEntryBytes', async () => {
    const result = await collectSitemap(chunked('<urlset><!--', 'a', 4 * MiB))

    expect(result._tag).toBe('failure')
    expect(messages(result)).toMatch(/exceeds 1048576 bytes/)
    expect(result.summary.bytesRead).toBeLessThan(2 * MiB)
  }, 120_000)

  it.each([
    ['closed comments', '<!---->'],
    ['whitespace', ' \n'],
  ])('drops finished %s between items without re-scanning them', async (_label, filler) => {
    const started = performance.now()
    const result = await collectSitemap(chunked('<urlset>', filler, 8 * MiB))
    const ms = performance.now() - started

    // never closed, so it fails - but only after reading to the end
    expect(result._tag).toBe('failure')
    expect(result.summary.bytesRead).toBeGreaterThanOrEqual(8 * MiB)
    // Pre-fix this re-walked everything per 4KB chunk (seconds to tens of
    // seconds); post-fix it is well under 100ms. Generous on purpose.
    expect(ms).toBeLessThan(2000)
  }, 120_000)

  it('keeps accepting markup that finishes within maxEntryBytes across chunks', async () => {
    const comment = `<!--${'c'.repeat(512 * 1024)}-->`
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n${comment}<?pi x?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${comment}\n`
      + `<url><loc>https://example.com/a</loc></url>${comment}<?pi y?>${' '.repeat(2 * MiB)}`
      + `<url><loc>https://example.com/b</loc></url><!-- end --></urlset>`
    function* oneKiB(): Generator<string> {
      for (let index = 0; index < xml.length; index += 1024)
        yield xml.slice(index, index + 1024)
    }
    const result = await collectSitemap(oneKiB())

    expect(result._tag).toBe('document')
    if (result._tag === 'document')
      expect(result.document.entries.map(entry => entry.loc)).toEqual(['https://example.com/a', 'https://example.com/b'])
  }, 60_000)

  it('keeps accepting a text sitemap split across chunks', async () => {
    const text = 'https://example.com/a\r\nhttps://example.com/b\nhttps://example.com/c'
    const result = await collectSitemap(text.split(''), { formatHint: 'text' })

    expect(result._tag).toBe('document')
    if (result._tag === 'document')
      expect(result.document.entries.map(entry => entry.loc)).toEqual(['https://example.com/a', 'https://example.com/b', 'https://example.com/c'])
  })

  it.each([
    ['unclosed comment after root close', '<urlset></urlset><!--', 'a'],
    ['trailing non-markup after root close', '<urlset></urlset>', 'a'],
  ])('bounds %s at maxEntryBytes', async (_label, prefix, filler) => {
    const result = await collectSitemap(chunked(prefix, filler, 2 * MiB), { maxEntryBytes: 64 * 1024 })

    expect(result._tag).toBe('failure')
    expect(messages(result)).toMatch(/exceeds 65536 bytes/)
    expect(result.summary.bytesRead).toBeLessThan(256 * 1024)
  })

  it.each([
    ['record start tag', '<urlset><url '],
    ['record body', '<urlset><url>'],
    ['comment', '<urlset><!--'],
  ])('handles small-chunk unfinished %s in linear time up to default maxEntryBytes', async (_label, prefix) => {
    const started = performance.now()
    const result = await collectSitemap(chunked(prefix, 'a', 2 * MiB, 256))
    const ms = performance.now() - started

    expect(result._tag).toBe('failure')
    expect(messages(result)).toMatch(/exceeds 1048576 bytes/)
    expect(ms).toBeLessThan(1000)
  }, 30_000)
})
