import type { ModuleRuntimeConfig, NitroUrlResolvers, ResolvedSitemapUrl, SitemapIndexEntry } from '../../src/runtime/types'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { urlsToIndexXml, urlsToIndexXmlStream } from '../../src/runtime/server/sitemap/builder/index-xml'
import { urlsToXml, urlsToXmlStream } from '../../src/runtime/server/sitemap/builder/xml'
import { createChunkedXmlStream, createNodeResponseStream, hasNonIdentityEncoding, negotiateCompressionEncoding } from '../../src/runtime/server/sitemap/stream'

const resolvers: NitroUrlResolvers = {
  canonicalUrlResolver: (url: string) => `https://example.com${url}`,
  relativeBaseUrlResolver: (url: string) => url,
  fixSlashes: (url: string) => url,
}

const urls: ResolvedSitemapUrl[] = Array.from({ length: 200 }, (_, index) => ({
  loc: `https://example.com/page-${index}?value=one&next=two`,
  lastmod: '2026-07-21',
  changefreq: 'weekly',
  priority: 0.8,
  images: [{ loc: `https://example.com/image-${index}.jpg`, title: `Image ${index}` }],
  _key: `page-${index}`,
  _path: null,
}))

const indexEntries: SitemapIndexEntry[] = [
  { sitemap: 'https://example.com/posts.xml', lastmod: '2026-07-21' },
  { sitemap: 'https://example.com/pages.xml' },
]

const config = {
  version: '8.2.3',
  xsl: '/__sitemap__/style.xsl',
  credits: true,
  minify: false,
} satisfies Pick<ModuleRuntimeConfig, 'version' | 'xsl' | 'credits' | 'minify'>

afterEach(() => {
  vi.useRealTimers()
})

describe('streaming XML serializers', () => {
  it.each([false, true])('matches buffered URL XML when minify is %s', async (minify) => {
    vi.useFakeTimers()
    vi.setSystemTime('2026-07-21T12:00:00.000Z')
    const options = { ...config, minify }

    expect(await new Response(urlsToXmlStream(urls, resolvers, options)).text())
      .toBe(urlsToXml(urls, resolvers, options))
  })

  it.each([false, true])('matches buffered sitemap index XML when minify is %s', async (minify) => {
    vi.useFakeTimers()
    vi.setSystemTime('2026-07-21T12:00:00.000Z')
    const options = { ...config, minify }

    expect(await new Response(urlsToIndexXmlStream(indexEntries, resolvers, options)).text())
      .toBe(urlsToIndexXml(indexEntries, resolvers, options))
  })

  it('preserves the sitemap index wire format', () => {
    expect(urlsToIndexXml(indexEntries, resolvers, { ...config, xsl: false, credits: false })).toBe(`<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <sitemap>
        <loc>https://example.com/posts.xml</loc>
        <lastmod>2026-07-21</lastmod>
    </sitemap>
    <sitemap>
        <loc>https://example.com/pages.xml</loc>
    </sitemap>
</sitemapindex>`)
  })

  it('batches fragments and stops producing after cancellation', async () => {
    let finalized = false
    function* fragments() {
      try {
        while (true)
          yield '1234'
      }
      finally {
        finalized = true
      }
    }

    const reader = createChunkedXmlStream(fragments(), 8).getReader()
    const first = await reader.read()
    expect(new TextDecoder().decode(first.value)).toBe('12341234')
    await reader.cancel()
    expect(finalized).toBe(true)
  })

  it('splits oversized fragments without corrupting Unicode', async () => {
    const value = `${'a'.repeat(20)}😀${'b'.repeat(20)}`
    const reader = createChunkedXmlStream([value], 8).getReader()
    const decoder = new TextDecoder()
    const chunks: Uint8Array[] = []
    while (true) {
      const result = await reader.read()
      if (result.done)
        break
      chunks.push(result.value)
    }

    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks.map(chunk => decoder.decode(chunk)).join('')).toBe(value)
  })

  it('waits for Node response drain before writing the next chunk', async () => {
    const writes: string[] = []
    let drain: (() => void) | undefined
    let ended = false
    const source = createChunkedXmlStream(['first', 'second'], 5)
    const stream = createNodeResponseStream(source)

    stream.on('end', () => {
      ended = true
    })
    stream.pipe({
      once(event, listener) {
        if (event === 'drain')
          drain = listener
      },
      write(chunk) {
        writes.push(new TextDecoder().decode(chunk))
        return writes.length > 1
      },
    })

    await vi.waitFor(() => expect(writes).toEqual(['first']))
    await Promise.resolve()
    expect(writes).toEqual(['first'])
    drain?.()
    await vi.waitFor(() => expect(ended).toBe(true))
    expect(writes.join('')).toBe('firstsecond')
  })

  it('cancels XML production when a Node response disconnects', async () => {
    let cancelled = false
    const source = new ReadableStream<Uint8Array>({
      cancel() {
        cancelled = true
      },
      pull(controller) {
        controller.enqueue(new Uint8Array([1]))
      },
    })
    const stream = createNodeResponseStream(source)

    stream.pipe({
      once() {},
      write() {
        return false
      },
    })
    await vi.waitFor(() => expect(source.locked).toBe(true))
    stream.abort(new Error('client disconnected'))

    await vi.waitFor(() => expect(cancelled).toBe(true))
  })
})

describe('compression negotiation', () => {
  it.each([
    [undefined, false],
    ['identity', false],
    ['gzip', true],
    [['identity', 'br'], true],
  ] as const)('detects an existing content encoding for %j', (encoding, expected) => {
    expect(hasNonIdentityEncoding(encoding)).toBe(expected)
  })

  it.each([
    ['', null],
    ['br', null],
    ['gzip', 'gzip'],
    ['deflate', 'deflate'],
    ['deflate;q=1, gzip;q=0.5', 'deflate'],
    ['gzip;q=0, deflate;q=0', null],
    ['gzip;q=0, *;q=0.8', 'deflate'],
    ['*;q=0.3', 'gzip'],
    ['GZIP; Q=1', 'gzip'],
  ] as const)('selects an encoding for %j', (header, expected) => {
    expect(negotiateCompressionEncoding(header)).toBe(expected)
  })
})
