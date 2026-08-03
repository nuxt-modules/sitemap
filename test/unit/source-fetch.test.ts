import { afterEach, describe, expect, it, vi } from 'vitest'

const { fetchMock } = vi.hoisted(() => ({
  fetchMock: vi.fn().mockResolvedValue({
    urls: [{ loc: '/from-ofetch' }],
  }),
}))

vi.mock('ofetch', async importOriginal => ({
  ...await importOriginal<typeof import('ofetch')>(),
  $fetch: fetchMock,
}))
vi.mock('#nuxtseo/h3', () => ({
  getRequestHost: vi.fn(),
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
})
