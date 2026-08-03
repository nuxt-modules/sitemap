import { describe, expect, it, vi } from 'vitest'
import { createFetchDocumentLoader } from '../src/fetch'

describe('fetch loader adapter', () => {
  it('requires injected fetch and always requests manual redirects', async () => {
    let cancelled = false
    const body = new ReadableStream<Uint8Array>({
      cancel() {
        cancelled = true
      },
    })
    const fetcher = vi.fn(async () => new Response(body, {
      status: 302,
      headers: { location: '/next.xml' },
    }))
    const loader = createFetchDocumentLoader({ fetch: fetcher })
    await expect(loader({
      url: 'https://example.com/sitemap.xml',
      resource: 'sitemap',
      source: 'root',
      depth: 0,
    })).resolves.toEqual({
      _tag: 'redirect',
      url: 'https://example.com/sitemap.xml',
      location: 'https://example.com/next.xml',
      status: 302,
    })
    expect(fetcher).toHaveBeenCalledWith(
      'https://example.com/sitemap.xml',
      expect.objectContaining({ redirect: 'manual' }),
    )
    expect(cancelled).toBe(true)
  })

  it('returns a tagged wire cap failure and cancels the unread body', async () => {
    let cancelled = false
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(8))
        controller.enqueue(new Uint8Array(8))
      },
      cancel() {
        cancelled = true
      },
    })
    const loader = createFetchDocumentLoader({
      fetch: async () => new Response(body),
    })
    await expect(loader({
      url: 'https://example.com/sitemap.xml',
      resource: 'sitemap',
      source: 'root',
      depth: 0,
      maxWireBytes: 10,
    })).resolves.toMatchObject({
      _tag: 'load_error',
      code: 'wire_limit',
    })
    expect(cancelled).toBe(true)
  })

  it('retains response chunks when enforcing the wire cap', async () => {
    const first = new Uint8Array([1, 2])
    const second = new Uint8Array([3, 4])
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(first)
        controller.enqueue(second)
        controller.close()
      },
    })
    const loader = createFetchDocumentLoader({
      fetch: async () => ({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        body,
      }),
    })
    const loaded = await loader({
      url: 'https://example.com/sitemap.xml',
      resource: 'sitemap',
      source: 'root',
      depth: 0,
      maxWireBytes: 10,
    })

    expect(loaded).toMatchObject({ _tag: 'body' })
    if (loaded._tag !== 'body')
      return
    expect(loaded.body).toEqual([first, second])
    expect((loaded.body as Uint8Array[])[0]).toBe(first)
    expect((loaded.body as Uint8Array[])[1]).toBe(second)
  })

  it.each([
    { status: 302, location: null },
    { status: 302, location: 'http://[' },
    { status: 404, location: null },
    { status: 500, location: null },
  ])('cancels unused response bodies for status $status and location $location', async ({ status, location }) => {
    let cancelled = false
    const body = new ReadableStream<Uint8Array>({
      cancel() {
        cancelled = true
      },
    })
    const loader = createFetchDocumentLoader({
      fetch: async () => new Response(body, {
        status,
        ...(location ? { headers: { location } } : {}),
      }),
    })
    await loader({
      url: 'https://example.com/sitemap.xml',
      resource: 'sitemap',
      source: 'root',
      depth: 0,
    })
    expect(cancelled).toBe(true)
  })
})
