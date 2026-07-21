import { describe, expect, it } from 'vitest'
import { parseSitemapIndexStream, parseSitemapStream, parseSitemapXmlStream } from '../../src/utils'

async function collect<T>(source: AsyncIterable<T>): Promise<T[]> {
  const values: T[] = []
  for await (const value of source)
    values.push(value)
  return values
}

describe('parseSitemapXmlStream', () => {
  it('parses URLs from arbitrarily split UTF-8 byte chunks', async () => {
    const xml = '<urlset><url><loc>https://example.com/中文🚀?a=1&amp;b=2</loc></url><url><loc>https://example.com/2</loc><priority>0.7</priority></url></urlset>'
    const bytes = new TextEncoder().encode(xml)
    const chunks = (async function* () {
      for (let offset = 0; offset < bytes.length; offset += 3)
        yield bytes.subarray(offset, offset + 3)
    })()

    const events = await collect(parseSitemapXmlStream(chunks))

    expect(events).toEqual([
      { _tag: 'url', url: { loc: 'https://example.com/中文🚀?a=1&b=2' } },
      { _tag: 'url', url: { loc: 'https://example.com/2', priority: 0.7 } },
    ])
  })

  it('preserves extensions, CDATA, and attributes across string chunks', async () => {
    const xml = `<urlset>
      <url>
        <loc><![CDATA[https://example.com/a&b]]></loc>
        <image:image><image:loc>https://example.com/image.jpg</image:loc></image:image>
        <xhtml:link rel="alternate" hreflang="fr" href="https://example.com/fr" />
      </url>
    </urlset>`
    const chunks = (async function* () {
      for (let offset = 0; offset < xml.length; offset += 7)
        yield xml.slice(offset, offset + 7)
    })()

    const events = await collect(parseSitemapXmlStream(chunks))

    expect(events).toEqual([{
      _tag: 'url',
      url: {
        loc: 'https://example.com/a&b',
        images: [{ loc: 'https://example.com/image.jpg' }],
        alternatives: [{ hreflang: 'fr', href: 'https://example.com/fr' }],
      },
    }])
  })

  it('emits validation warnings without accumulating them', async () => {
    const xml = '<urlset><url><changefreq>daily</changefreq></url></urlset>'
    const events = await collect(parseSitemapXmlStream([xml]))

    expect(events).toEqual([
      {
        _tag: 'warning',
        warning: {
          type: 'validation',
          message: 'URL entry missing required loc element',
          context: { url: 'undefined' },
        },
      },
      {
        _tag: 'warning',
        warning: {
          type: 'validation',
          message: 'No valid URLs found in sitemap after validation',
        },
      },
    ])
  })

  it('applies backpressure and does not read beyond the yielded URL', async () => {
    let chunksRead = 0
    const chunks = (async function* () {
      chunksRead++
      yield '<urlset><url><loc>https://example.com/1</loc></url>'
      chunksRead++
      yield '<url><loc>https://example.com/2</loc></url></urlset>'
    })()
    const events = parseSitemapXmlStream(chunks)[Symbol.asyncIterator]()

    await expect(events.next()).resolves.toEqual({
      done: false,
      value: { _tag: 'url', url: { loc: 'https://example.com/1' } },
    })
    expect(chunksRead).toBe(1)

    await expect(events.next()).resolves.toEqual({
      done: false,
      value: { _tag: 'url', url: { loc: 'https://example.com/2' } },
    })
    expect(chunksRead).toBe(2)
  })

  it('rejects a single URL entry beyond the configured memory bound', async () => {
    const xml = `<urlset><url><loc>https://example.com/${'x'.repeat(128)}</loc></url></urlset>`

    await expect(collect(parseSitemapXmlStream([xml], { maxEntryBytes: 64 }))).rejects.toThrow(
      'Sitemap entry exceeds maxEntryBytes of 64',
    )
  })

  it('rejects unterminated markup beyond the configured buffer bound', async () => {
    const chunks = ['<urlset data="', 'x'.repeat(128)]

    await expect(collect(parseSitemapStream(chunks, { maxBufferBytes: 64 }))).rejects.toThrow(
      'Sitemap XML buffer exceeds maxBufferBytes of 64',
    )
  })

  it('distinguishes an empty urlset from empty or non-sitemap input', async () => {
    await expect(collect(parseSitemapXmlStream(['<urlset></urlset>']))).resolves.toEqual([])
    await expect(collect(parseSitemapXmlStream([]))).rejects.toThrow('Empty XML input provided')
    await expect(collect(parseSitemapXmlStream(['<sitemapindex />']))).rejects.toThrow('XML does not contain a valid urlset element')
  })
})

describe('parseSitemapStream', () => {
  it('classifies a urlset before yielding its URLs', async () => {
    const events = await collect(parseSitemapStream([
      '<?xml version="1.0"?><url',
      'set><url><loc>https://example.com/</loc></url></urlset>',
    ]))

    expect(events).toEqual([
      { _tag: 'kind', kind: 'urlset' },
      { _tag: 'url', url: { loc: 'https://example.com/' } },
    ])
  })

  it('classifies and streams sitemap index entries', async () => {
    const events = await collect(parseSitemapStream([
      '<sitemapindex><sitemap><loc>https://example.com/a.xml</loc>',
      '<lastmod>2026-07-21</lastmod></sitemap></sitemapindex>',
    ]))

    expect(events).toEqual([
      { _tag: 'kind', kind: 'index' },
      {
        _tag: 'sitemap',
        sitemap: { loc: 'https://example.com/a.xml', lastmod: '2026-07-21' },
      },
    ])
  })

  it('supports an index-only iterator', async () => {
    const events = await collect(parseSitemapIndexStream([
      '<sitemapindex><sitemap><loc>https://example.com/a.xml</loc></sitemap></sitemapindex>',
    ]))

    expect(events).toEqual([
      { _tag: 'sitemap', sitemap: { loc: 'https://example.com/a.xml' } },
    ])
  })

  it('reports a closed empty urlset structurally', async () => {
    await expect(collect(parseSitemapStream(['<urlset />']))).resolves.toEqual([
      { _tag: 'kind', kind: 'urlset' },
    ])
  })

  it('cancels a ReadableStream when the consumer stops early', async () => {
    let cancelled = false
    const source = new ReadableStream<string>({
      start(controller) {
        controller.enqueue('<urlset><url><loc>https://example.com/1</loc></url>')
      },
      cancel() {
        cancelled = true
      },
    })
    const iterator = parseSitemapStream(source)

    await expect(iterator.next()).resolves.toEqual({
      done: false,
      value: { _tag: 'kind', kind: 'urlset' },
    })
    await expect(iterator.next()).resolves.toEqual({
      done: false,
      value: { _tag: 'url', url: { loc: 'https://example.com/1' } },
    })
    await iterator.return(undefined)

    expect(cancelled).toBe(true)
  })

  it('does not validate an unread tail after an early stop', async () => {
    const source = (async function* () {
      yield '<urlset><url><loc>https://example.com/1</loc></url>'
      throw new Error('tail should remain unread')
    })()

    for await (const event of parseSitemapStream(source)) {
      if (event._tag === 'url')
        break
    }
  })
})
