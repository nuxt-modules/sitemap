import type { SitemapDocumentLoader } from '../src'
import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  createSitemapReader,
  parseRobotsSitemaps,

} from '../src'

const encoder = new TextEncoder()

describe('sitemap reader', () => {
  it('parses robots Sitemap directives without product policy', () => {
    expect(parseRobotsSitemaps(
      'User-agent: *\nSitemap: /sitemap.xml\nsitemap: https://cdn.example.com/index.xml\nSitemap: /sitemap.xml',
      'https://example.com/robots.txt',
    )).toEqual([
      { loc: 'https://example.com/sitemap.xml' },
      { loc: 'https://cdn.example.com/index.xml' },
    ])
  })

  it('uses manual redirects and authorizes every root, redirect and index child', async () => {
    const documents = new Map<string, string>([
      ['https://example.com/index.xml', 'redirect:https://cdn.example.com/index.xml'],
      ['https://cdn.example.com/index.xml', '<sitemapindex><sitemap><loc>https://assets.example.com/a.xml</loc></sitemap></sitemapindex>'],
      ['https://assets.example.com/a.xml', '<urlset><url><loc>https://example.com/a</loc></url></urlset>'],
    ])
    const loadDocument: SitemapDocumentLoader = async ({ url }) => {
      const value = documents.get(url)
      if (!value)
        return { _tag: 'not_found', url, status: 404 }
      if (value.startsWith('redirect:'))
        return { _tag: 'redirect', url, location: value.slice(9), status: 302 }
      return { _tag: 'body', url, body: encoder.encode(value) }
    }
    const authorized: string[] = []
    const authorizeTarget = async (request: { url: string }) => {
      authorized.push(request.url)
      return { _tag: 'allow' as const }
    }
    const reader = createSitemapReader({ loadDocument, authorizeTarget })

    await expect(reader.walk('https://example.com/index.xml')).resolves.toMatchObject({
      _tag: 'complete',
      entries: [{ loc: 'https://example.com/a' }],
      documentsRead: 2,
    })
    expect(authorized).toEqual([
      'https://example.com/index.xml',
      'https://cdn.example.com/index.xml',
      'https://assets.example.com/a.xml',
    ])
  })

  it('returns explicit traversal partial reasons', async () => {
    const loadDocument: SitemapDocumentLoader = async ({ url }) => ({
      _tag: 'body',
      url,
      body: encoder.encode(
        url.endsWith('index.xml')
          ? '<sitemapindex><sitemap><loc>https://example.com/a.xml</loc></sitemap></sitemapindex>'
          : '<urlset><url><loc>https://example.com/a</loc></url></urlset>',
      ),
    })
    const reader = createSitemapReader({
      loadDocument,
      authorizeTarget: async () => ({ _tag: 'allow' }),
    })

    await expect(reader.walk('https://example.com/index.xml', { maxDepth: 0 })).resolves.toMatchObject({
      _tag: 'partial',
      reasons: ['depth_limit'],
      documentsRead: 1,
    })
    await expect(reader.walk('https://example.com/index.xml', { maxDocuments: 1 })).resolves.toMatchObject({
      _tag: 'partial',
      reasons: ['document_limit'],
      documentsRead: 1,
    })
  })

  it('skips duplicate documents before applying the document cap', async () => {
    const loadDocument: SitemapDocumentLoader = async ({ url }) => ({
      _tag: 'body',
      url,
      body: encoder.encode(
        url.endsWith('index.xml')
          ? '<sitemapindex><sitemap><loc>https://example.com/a.xml</loc></sitemap><sitemap><loc>https://example.com/a.xml</loc></sitemap></sitemapindex>'
          : '<urlset><url><loc>https://example.com/a</loc></url></urlset>',
      ),
    })
    const reader = createSitemapReader({
      loadDocument,
      authorizeTarget: async () => ({ _tag: 'allow' }),
    })
    await expect(reader.walk('https://example.com/index.xml', { maxDocuments: 2 })).resolves.toMatchObject({
      _tag: 'complete',
      documentsRead: 2,
    })
  })

  it('counts failed loads against the document request cap', async () => {
    const loaded: string[] = []
    const reader = createSitemapReader({
      loadDocument: async ({ url }) => {
        loaded.push(url)
        if (url.endsWith('index.xml')) {
          return {
            _tag: 'body',
            url,
            body: encoder.encode(
              '<sitemapindex><sitemap><loc>https://example.com/a.xml</loc></sitemap><sitemap><loc>https://example.com/b.xml</loc></sitemap></sitemapindex>',
            ),
          }
        }
        return { _tag: 'not_found', url, status: 404 }
      },
      authorizeTarget: async () => ({ _tag: 'allow' }),
    })

    await expect(reader.walk('https://example.com/index.xml', { maxDocuments: 2 })).resolves.toMatchObject({
      _tag: 'partial',
      reasons: ['read_failure', 'document_limit'],
      documentsRead: 1,
      documentsAttempted: 2,
    })
    expect(loaded).toEqual([
      'https://example.com/index.xml',
      'https://example.com/a.xml',
    ])
  })

  it('stops loading queued documents once the URL cap is reached', async () => {
    const loaded: string[] = []
    const loadDocument: SitemapDocumentLoader = async ({ url }) => {
      loaded.push(url)
      return {
        _tag: 'body',
        url,
        body: encoder.encode(
          url.endsWith('index.xml')
            ? '<sitemapindex><sitemap><loc>https://example.com/a.xml</loc></sitemap><sitemap><loc>https://example.com/b.xml</loc></sitemap></sitemapindex>'
            : `<urlset><url><loc>https://example.com/${url.endsWith('a.xml') ? 'a' : 'b'}</loc></url></urlset>`,
        ),
      }
    }
    const reader = createSitemapReader({
      loadDocument,
      authorizeTarget: async () => ({ _tag: 'allow' }),
    })
    await expect(reader.walk('https://example.com/index.xml', { maxUrls: 1 })).resolves.toMatchObject({
      _tag: 'partial',
      reasons: ['url_limit'],
      entries: [{ loc: 'https://example.com/a' }],
    })
    expect(loaded).toEqual([
      'https://example.com/index.xml',
      'https://example.com/a.xml',
    ])
  })

  it('loads concurrently while visiting documents in deterministic BFS order', async () => {
    let active = 0
    let peak = 0
    const completed: string[] = []
    const visited: Array<{
      requestedUrl: string
      resolvedUrl: string
      source: string
      depth: number
      parentUrl?: string
    }> = []
    const documents = new Map([
      [
        'https://example.com/index.xml',
        '<sitemapindex><sitemap><loc>https://example.com/a.xml</loc></sitemap><sitemap><loc>https://example.com/b.xml</loc></sitemap></sitemapindex>',
      ],
      ['https://example.com/a.xml', '<urlset><url><loc>https://example.com/a</loc></url></urlset>'],
      ['https://example.com/b.xml', '<urlset><url><loc>https://example.com/b</loc></url></urlset>'],
    ])
    const reader = createSitemapReader({
      loadDocument: async ({ url }) => {
        active++
        peak = Math.max(peak, active)
        await new Promise(resolve => setTimeout(resolve, url.endsWith('a.xml') ? 20 : 1))
        active--
        completed.push(url)
        return {
          _tag: 'body',
          url: `${url}?resolved`,
          body: encoder.encode(documents.get(url)!),
        }
      },
      authorizeTarget: async () => ({ _tag: 'allow' }),
    })

    const result = await reader.walk('https://example.com/index.xml', {
      concurrency: 2,
      retention: 'none',
      onDocument(document) {
        visited.push({
          requestedUrl: document.requestedUrl,
          resolvedUrl: document.resolvedUrl,
          source: document.source,
          depth: document.depth,
          ...(document.parentUrl ? { parentUrl: document.parentUrl } : {}),
        })
      },
    })

    expectTypeOf(result.entriesRetained).toEqualTypeOf<false>()
    expect(peak).toBe(2)
    expect(completed).toEqual([
      'https://example.com/index.xml',
      'https://example.com/b.xml',
      'https://example.com/a.xml',
    ])
    expect(visited).toEqual([
      {
        requestedUrl: 'https://example.com/index.xml',
        resolvedUrl: 'https://example.com/index.xml?resolved',
        source: 'root',
        depth: 0,
      },
      {
        requestedUrl: 'https://example.com/a.xml',
        resolvedUrl: 'https://example.com/a.xml?resolved',
        source: 'index_child',
        depth: 1,
        parentUrl: 'https://example.com/index.xml?resolved',
      },
      {
        requestedUrl: 'https://example.com/b.xml',
        resolvedUrl: 'https://example.com/b.xml?resolved',
        source: 'index_child',
        depth: 1,
        parentUrl: 'https://example.com/index.xml?resolved',
      },
    ])
    expect(result).toMatchObject({
      _tag: 'complete',
      entriesRetained: false,
      entries: [],
      references: [],
      urlsObserved: 2,
      referencesObserved: 2,
      documentsAttempted: 3,
      documentsRead: 3,
    })
  })

  it('shares the document budget across concurrent roots', async () => {
    let active = 0
    let peak = 0
    const loaded: string[] = []
    const reader = createSitemapReader({
      loadDocument: async ({ url }) => {
        active++
        peak = Math.max(peak, active)
        loaded.push(url)
        await new Promise(resolve => setTimeout(resolve, 5))
        active--
        return {
          _tag: 'body',
          url,
          body: encoder.encode('<urlset></urlset>'),
        }
      },
      authorizeTarget: async () => ({ _tag: 'allow' }),
    })

    const result = await reader.walk([
      'https://example.com/a.xml',
      'https://example.com/b.xml',
      'https://example.com/c.xml',
    ], {
      concurrency: 3,
      maxDocuments: 2,
    })

    expectTypeOf(result.entriesRetained).toEqualTypeOf<true>()
    expect(loaded).toEqual([
      'https://example.com/a.xml',
      'https://example.com/b.xml',
    ])
    expect(peak).toBe(2)
    expect(result).toMatchObject({
      _tag: 'partial',
      reasons: ['document_limit'],
      documentsAttempted: 2,
      documentsRead: 2,
    })
  })

  it('does not visit or retain a document that exceeds the aggregate URL budget', async () => {
    const visited: string[] = []
    const reader = createSitemapReader({
      loadDocument: async ({ url }) => ({
        _tag: 'body',
        url,
        body: encoder.encode(
          url.endsWith('index.xml')
            ? '<sitemapindex><sitemap><loc>https://example.com/a.xml</loc></sitemap><sitemap><loc>https://example.com/b.xml</loc></sitemap></sitemapindex>'
            : `<urlset><url><loc>https://example.com/${url.endsWith('a.xml') ? 'a' : 'b'}</loc></url></urlset>`,
        ),
      }),
      authorizeTarget: async () => ({ _tag: 'allow' }),
    })

    const result = await reader.walk('https://example.com/index.xml', {
      concurrency: 2,
      maxUrls: 1,
      onDocument(document) {
        visited.push(document.requestedUrl)
      },
    })

    expect(visited).toEqual([
      'https://example.com/index.xml',
      'https://example.com/a.xml',
    ])
    expect(result).toMatchObject({
      _tag: 'partial',
      reasons: ['url_limit'],
      entries: [{ loc: 'https://example.com/a' }],
      urlsObserved: 1,
    })
  })

  it('aborts sibling reads and rejects the original visitor failure', async () => {
    const failure = new Error('visitor failed')
    let siblingAborted = false
    const reader = createSitemapReader({
      loadDocument: async ({ url, signal }) => {
        if (url.endsWith('a.xml')) {
          return {
            _tag: 'body',
            url,
            body: encoder.encode('<urlset></urlset>'),
          }
        }
        if (signal?.aborted) {
          siblingAborted = true
        }
        else {
          await new Promise<void>((resolve) => {
            const timer = setTimeout(resolve, 50)
            signal?.addEventListener('abort', () => {
              clearTimeout(timer)
              siblingAborted = true
              resolve()
            }, { once: true })
          })
        }
        return {
          _tag: 'load_error',
          url,
          code: 'cancelled',
          detail: 'cancelled by sibling',
        }
      },
      authorizeTarget: async () => ({ _tag: 'allow' }),
    })

    await expect(reader.walk([
      'https://example.com/a.xml',
      'https://example.com/b.xml',
    ], {
      concurrency: 2,
      onDocument: () => {
        throw failure
      },
    })).rejects.toBe(failure)
    expect(siblingAborted).toBe(true)
  })

  it('returns an explicit partial result when the caller aborts traversal', async () => {
    const controller = new AbortController()
    const reader = createSitemapReader({
      loadDocument: async ({ url, signal }) => {
        await new Promise<void>((resolve) => {
          if (signal?.aborted) {
            resolve()
            return
          }
          signal?.addEventListener('abort', () => resolve(), { once: true })
        })
        return {
          _tag: 'load_error',
          url,
          code: 'cancelled',
          detail: 'caller cancelled',
        }
      },
      authorizeTarget: async () => ({ _tag: 'allow' }),
    })

    const walking = reader.walk([
      'https://example.com/a.xml',
      'https://example.com/b.xml',
    ], {
      concurrency: 2,
      signal: controller.signal,
    })
    controller.abort()

    await expect(walking).resolves.toMatchObject({
      _tag: 'partial',
      reasons: ['cancelled'],
      documentsAttempted: 2,
      documentsRead: 0,
      failures: [],
    })
  })

  it('surfaces denied authority as a read failure', async () => {
    const reader = createSitemapReader({
      loadDocument: async ({ url }) => ({ _tag: 'not_found', url, status: 404 }),
      authorizeTarget: async () => ({ _tag: 'deny', reason: 'private network' }),
    })

    await expect(reader.read('https://example.com/sitemap.xml')).resolves.toEqual({
      _tag: 'failure',
      url: 'https://example.com/sitemap.xml',
      reason: 'unauthorized',
      detail: 'private network',
    })
  })

  it('preserves loader failure codes through the reader', async () => {
    const reader = createSitemapReader({
      loadDocument: async ({ url }) => ({
        _tag: 'load_error',
        url,
        code: 'timeout',
        detail: 'upstream timed out',
      }),
      authorizeTarget: async () => ({ _tag: 'allow' }),
    })

    await expect(reader.read('https://example.com/sitemap.xml')).resolves.toMatchObject({
      _tag: 'failure',
      reason: 'load',
      code: 'timeout',
    })
  })
})
