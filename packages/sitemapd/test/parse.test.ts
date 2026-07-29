import { describe, expect, it } from 'vitest'
import { collectSitemap, parseSitemap } from '../src/parse'

async function events(input: Parameters<typeof parseSitemap>[0], options?: Parameters<typeof parseSitemap>[1]) {
  const output = []
  for await (const event of parseSitemap(input, options))
    output.push(event)
  return output
}

async function gzip(input: string): Promise<Uint8Array> {
  const source = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(input))
      controller.close()
    },
  })
  const output = source.pipeThrough(
    new CompressionStream('gzip') as unknown as ReadableWritablePair<Uint8Array, Uint8Array>,
  )
  const chunks = []
  let length = 0
  for await (const chunk of output) {
    chunks.push(chunk)
    length += chunk.byteLength
  }
  const bytes = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return bytes
}

describe('canonical sitemap parser', () => {
  it('preserves raw XML urlset evidence and extensions', async () => {
    const result = await collectSitemap(`
      <urlset xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
              xmlns:xhtml="http://www.w3.org/1999/xhtml">
        <url>
          <loc>https://example.com/Foo/?x=1&amp;y=2</loc>
          <lastmod>2026-07-29T01:02:03.456Z</lastmod>
          <changefreq>Sometimes</changefreq>
          <priority>1.20</priority>
          <image:image><image:loc>https://example.com/i.jpg</image:loc></image:image>
          <xhtml:link rel="alternate" hreflang="fr" href="https://example.com/fr" />
        </url>
      </urlset>
    `)

    expect(result).toMatchObject({
      _tag: 'document',
      document: {
        _tag: 'urlset',
        format: 'xml',
        entries: [{
          loc: 'https://example.com/Foo/?x=1&y=2',
          lastmod: '2026-07-29T01:02:03.456Z',
          changefreq: 'Sometimes',
          priority: '1.20',
          extensions: {
            images: [{ loc: 'https://example.com/i.jpg' }],
            alternatives: [{ rel: 'alternate', hreflang: 'fr', href: 'https://example.com/fr' }],
          },
        }],
      },
      completeness: { _tag: 'complete' },
    })
  })

  it('parses XML sitemap indexes', async () => {
    await expect(collectSitemap(
      '<sitemapindex><sitemap><loc>https://example.com/a.xml</loc><lastmod>2026-07-29</lastmod></sitemap></sitemapindex>',
    )).resolves.toMatchObject({
      _tag: 'document',
      document: {
        _tag: 'index',
        entries: [{ loc: 'https://example.com/a.xml', lastmod: '2026-07-29' }],
      },
    })
  })

  it('parses namespace-prefixed roots and records', async () => {
    await expect(collectSitemap(
      '<sm:urlset xmlns:sm="http://www.sitemaps.org/schemas/sitemap/0.9"><sm:url><sm:loc>https://example.com/prefixed</sm:loc></sm:url></sm:urlset>',
    )).resolves.toMatchObject({
      _tag: 'document',
      document: { entries: [{ loc: 'https://example.com/prefixed' }] },
    })
  })

  it('does not treat closing markup inside CDATA as the record close', async () => {
    const input = [
      '<urlset><url><loc><![CDATA[https://example.com/a</url>',
      ']]></loc></url></urlset>',
    ]
    await expect(collectSitemap(input)).resolves.toMatchObject({
      _tag: 'document',
      document: { entries: [{ loc: 'https://example.com/a</url>' }] },
    })
  })

  it('waits for comments split across chunks', async () => {
    await expect(collectSitemap([
      '<urlset><!-- a > split',
      ' comment --><url><loc>https://example.com/comment</loc></url></urlset>',
    ])).resolves.toMatchObject({
      _tag: 'document',
      document: { entries: [{ loc: 'https://example.com/comment' }] },
    })
  })

  it('parses RSS 2.0 with mRSS evidence', async () => {
    await expect(collectSitemap(`
      <rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
        <channel>
        <title>Example feed</title>
        <link>https://example.com/</link>
        <description>Recent posts</description>
        <item>
          <link>https://example.com/post</link>
          <pubDate>Tue, 29 Jul 2026 01:02:03 GMT</pubDate>
          <media:content url="https://example.com/video.mp4" type="video/mp4" />
          <media:thumbnail url="https://example.com/thumb.jpg" />
        </item></channel>
      </rss>
    `)).resolves.toMatchObject({
      _tag: 'document',
      document: {
        _tag: 'urlset',
        format: 'rss2',
        entries: [{
          loc: 'https://example.com/post',
          lastmod: 'Tue, 29 Jul 2026 01:02:03 GMT',
          extensions: {
            media: {
              contents: [{ url: 'https://example.com/video.mp4', type: 'video/mp4' }],
              thumbnails: [{ url: 'https://example.com/thumb.jpg' }],
            },
          },
        }],
      },
    })
  })

  it('parses Atom 1.0', async () => {
    await expect(collectSitemap(`
      <feed xmlns="http://www.w3.org/2005/Atom">
        <title>Example feed</title>
        <id>https://example.com/</id>
        <updated>2026-07-29T01:02:03Z</updated>
        <entry>
          <link rel="alternate" href="https://example.com/atom" />
          <updated>2026-07-29T01:02:03Z</updated>
        </entry>
      </feed>
    `)).resolves.toMatchObject({
      _tag: 'document',
      document: {
        _tag: 'urlset',
        format: 'atom1',
        entries: [{ loc: 'https://example.com/atom', lastmod: '2026-07-29T01:02:03Z' }],
      },
    })
  })

  it('parses text only with an explicit hint', async () => {
    await expect(collectSitemap(
      'https://example.com/A?x=1\nhttps://example.com/b\n',
      { formatHint: 'text' },
    )).resolves.toMatchObject({
      _tag: 'document',
      document: {
        _tag: 'urlset',
        format: 'text',
        entries: [{ loc: 'https://example.com/A?x=1' }, { loc: 'https://example.com/b' }],
      },
    })
    await expect(collectSitemap('https://example.com/A?x=1')).resolves.toMatchObject({
      _tag: 'failure',
      completeness: { _tag: 'failed', reason: 'unsupported' },
    })
    await expect(collectSitemap(' \n\t ', { formatHint: 'text' })).resolves.toMatchObject({
      _tag: 'failure',
      completeness: { _tag: 'failed', reason: 'empty' },
    })
  })

  it('detects and decompresses gzip bytes', async () => {
    const compressed = await gzip('<urlset><url><loc>https://example.com/gzip</loc></url></urlset>')
    await expect(collectSitemap(compressed)).resolves.toMatchObject({
      _tag: 'document',
      document: { entries: [{ loc: 'https://example.com/gzip' }] },
    })
  })

  it.each([
    ['', 'empty'],
    ['<html><body>not a sitemap</body></html>', 'html'],
    ['<urlset><url></urlset>', 'malformed'],
  ] as const)('returns tagged failure for %s', async (input, reason) => {
    await expect(collectSitemap(input)).resolves.toMatchObject({
      _tag: 'failure',
      completeness: { _tag: 'failed', reason },
    })
  })

  it('returns invalid UTF-8 as a tagged failure', async () => {
    await expect(collectSitemap(new Uint8Array([0xC3, 0x28]))).resolves.toMatchObject({
      _tag: 'failure',
      completeness: { _tag: 'failed', reason: 'invalid_utf8' },
    })
  })

  it('tags entry caps as partial and always emits a terminal end event', async () => {
    const output = await events(
      '<urlset><url><loc>https://example.com/1</loc></url><url><loc>https://example.com/2</loc></url></urlset>',
      { maxEntries: 1 },
    )
    expect(output.at(-1)).toMatchObject({
      _tag: 'end',
      completeness: { _tag: 'partial', reason: 'entry_limit' },
    })
    expect(output.filter(event => event._tag === 'url')).toHaveLength(1)
  })

  it('streams entries with backpressure instead of buffering the document', async () => {
    let chunksRead = 0
    const input = (async function* () {
      chunksRead++
      yield '<urlset><url><loc>https://example.com/1</loc></url>'
      chunksRead++
      yield '<url><loc>https://example.com/2</loc></url></urlset>'
    })()
    const iterator = parseSitemap(input)
    await expect(iterator.next()).resolves.toMatchObject({
      value: { _tag: 'document', kind: 'urlset' },
    })
    await expect(iterator.next()).resolves.toMatchObject({
      value: { _tag: 'url', entry: { loc: 'https://example.com/1' } },
    })
    expect(chunksRead).toBe(1)
    await iterator.return(undefined)
  })

  it('cancels a body when the consumer stops early', async () => {
    let cancelled = false
    const input = new ReadableStream<string>({
      start(controller) {
        controller.enqueue('<urlset><url><loc>https://example.com/1</loc></url>')
      },
      cancel() {
        cancelled = true
      },
    })
    const iterator = parseSitemap(input)
    await iterator.next()
    await iterator.next()
    await iterator.return(undefined)
    expect(cancelled).toBe(true)
  })

  it('cancels unread bodies when the byte cap is exceeded', async () => {
    let cancelled = false
    const input = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('<urlset>'))
        controller.enqueue(new Uint8Array(128))
      },
      cancel() {
        cancelled = true
      },
    })
    const output = await events(input, { maxDecodedBytes: 16 })
    expect(output.at(-1)).toMatchObject({
      _tag: 'end',
      completeness: { _tag: 'partial', reason: 'decoded_limit' },
    })
    expect(cancelled).toBe(true)
  })

  it('propagates unexpected stream failures', async () => {
    const input = (async function* () {
      yield new TextEncoder().encode('<urlset>')
      throw new Error('transport died')
    })()
    await expect(events(input)).rejects.toThrow('transport died')
  })

  it.each([
    { maxDecodedBytes: -1 },
    { maxEntries: Number.NaN },
    { maxEntryBytes: 1.5 },
  ])('rejects invalid limits at the boundary', async (options) => {
    await expect(events('<urlset />', options)).rejects.toThrow(RangeError)
  })
})
