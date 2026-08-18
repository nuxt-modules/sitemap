import { afterEach, describe, expect, it, vi } from 'vitest'

const { fetchMock, fetchWithEventMock } = vi.hoisted(() => ({
  fetchMock: vi.fn().mockResolvedValue({
    urls: [{ loc: '/from-ofetch' }],
  }),
  fetchWithEventMock: vi.fn().mockResolvedValue({
    urls: [{ loc: '/from-event' }],
  }),
}))

vi.mock('ofetch', async importOriginal => ({
  ...await importOriginal<typeof import('ofetch')>(),
  $fetch: fetchMock,
}))
vi.mock('#nuxtseo/h3', () => ({
  getRequestHost: vi.fn(),
  getHeader: vi.fn(),
}))
vi.mock('#nuxtseo/nitro', () => ({
  fetchWithEvent: fetchWithEventMock,
  defineCachedFunction: (fn: unknown) => fn,
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

describe('fetchDataSource', () => {
  afterEach(() => {
    fetchMock.mockClear()
    fetchWithEventMock.mockClear()
  })

  it('uses the imported ofetch fallback without Nitro globals', async () => {
    const { fetchDataSource } = await import('../../src/runtime/server/sitemap/urlset/sources')
    const result = await fetchDataSource({
      fetch: 'https://example.com/urls.json',
    })

    expect(result.urls).toEqual([{ loc: '/from-ofetch' }])
    expect(result._isFailure).toBeUndefined()
    expect(fetchMock).toHaveBeenCalledOnce()
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
})
