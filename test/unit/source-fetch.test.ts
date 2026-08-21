import { afterEach, describe, expect, it, vi } from 'vitest'

const { fetchWithEventMock, cachedFunctions } = vi.hoisted(() => ({
  fetchWithEventMock: vi.fn().mockResolvedValue({
    urls: [{ loc: '/from-event' }],
  }),
  cachedFunctions: [] as Array<{ name: string, opts: Record<string, any> }>,
}))

vi.mock('#nuxtseo/h3', () => ({
  getRequestHost: vi.fn(),
  getHeader: vi.fn(() => 'test-host'),
}))
vi.mock('#nuxtseo/nitro', () => ({
  fetchWithEvent: fetchWithEventMock,
  defineCachedFunction: (fn: unknown, opts: Record<string, any> = {}) => {
    cachedFunctions.push({ name: opts.name, opts })
    return fn
  },
}))
vi.mock('#sitemap-virtual/static-config.mjs', () => ({
  default: { cacheMaxAgeSeconds: 600 },
}))
vi.mock('#sitemap-virtual/global-sources.mjs', () => ({
  sources: [],
}))
vi.mock('#sitemap-virtual/read-sources.mjs', () => ({
  readSourcesFromFilesystem: vi.fn(),
}))

function stubFetch(body: string, contentType: string) {
  const fetchSpy = vi.fn(() => Promise.resolve(
    new Response(body, { headers: { 'content-type': contentType } }),
  ))
  vi.stubGlobal('fetch', fetchSpy)
  return fetchSpy
}

describe('fetchDataSource', () => {
  afterEach(() => {
    fetchWithEventMock.mockClear()
    vi.unstubAllGlobals()
  })

  it('uses the imported ofetch fallback without Nitro globals', async () => {
    const fetchSpy = stubFetch(JSON.stringify({ urls: [{ loc: '/from-ofetch' }] }), 'application/json')
    const { fetchDataSource } = await import('../../src/runtime/server/sitemap/urlset/sources')
    const result = await fetchDataSource({
      fetch: 'https://example.com/urls.json',
    })

    expect(result.urls).toEqual([{ loc: '/from-ofetch' }])
    expect(result._isFailure).toBeUndefined()
    expect(fetchSpy).toHaveBeenCalledOnce()
  })

  it('uses the Nitro compatibility fetch for internal sources', async () => {
    const { fetchDataSource } = await import('../../src/runtime/server/sitemap/urlset/sources')
    const event = {} as any
    const result = await fetchDataSource({
      fetch: '/api/urls',
    }, event)

    expect(result.urls).toEqual([{ loc: '/from-event' }])
    expect(result._isFailure).toBeUndefined()
    expect(fetchWithEventMock).toHaveBeenCalledWith(event, '/api/urls', expect.any(Object))
  })

  it('marks an HTML response as a failure so it is never cached', async () => {
    stubFetch('<!DOCTYPE html><html><body>login page</body></html>', 'text/html')
    const { fetchDataSource } = await import('../../src/runtime/server/sitemap/urlset/sources')

    const result = await fetchDataSource({
      fetch: ['https://example.com/behind-auth', { headers: { Authorization: 'Bearer token' } }],
    })

    expect(result.urls).toEqual([])
    expect(result.error).toContain('HTML')
    expect(result._isFailure).toBe(true)
  })

  it('hashes source options out of the cache storage key', async () => {
    await import('../../src/runtime/server/sitemap/urlset/sources')
    const sourceCache = cachedFunctions.find(c => c.name === 'sitemap:source-urls')
    expect(sourceCache).toBeDefined()

    const event = {} as any
    const key = await sourceCache!.opts.getKey(event, '/api/urls::{"headers":{"Authorization":"Bearer secret-token"}}')

    expect(key).toContain('test-host')
    expect(key).not.toContain('secret-token')
    expect(key).not.toContain('Authorization')
    expect(key).not.toContain('{')
  })

  it('rejects cached source fetches that failed', async () => {
    await import('../../src/runtime/server/sitemap/urlset/sources')
    const sourceCache = cachedFunctions.find(c => c.name === 'sitemap:source-urls')
    expect(sourceCache).toBeDefined()

    expect(sourceCache!.opts.validate({ value: { urls: [], _isFailure: true } })).toBe(false)
    expect(sourceCache!.opts.validate({ value: { urls: [{ loc: '/a' }] } })).toBe(true)
    expect(sourceCache!.opts.validate({})).toBe(false)
  })
})
