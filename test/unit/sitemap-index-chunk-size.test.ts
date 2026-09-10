import type { ModuleRuntimeConfig, NitroUrlResolvers } from '../../src/runtime/types'
import { describe, expect, it, vi } from 'vitest'
import { buildSitemapIndex } from '../../src/runtime/server/sitemap/builder/sitemap-index'
import { sliceUrlsForChunk } from '../../src/runtime/server/sitemap/utils/chunk'

const { urls } = vi.hoisted(() => ({
  urls: Array.from({ length: 2500 }, (_, i) => ({ loc: `/page/${i}` })),
}))

vi.mock('#nuxtseo/h3', () => ({
  getHeader: vi.fn(),
}))
vi.mock('#nuxtseo/nitro', () => ({
  defineCachedFunction: (fn: unknown) => fn,
}))
vi.mock('#sitemap-virtual/static-config.mjs', () => ({
  default: { cacheMaxAgeSeconds: 600 },
}))
vi.mock('../../src/runtime/server/sitemap/builder/sitemap', () => ({
  getResolvedSitemapUrls: vi.fn(async () => ({ urls, failedSources: [] })),
}))

// An index for 2,500 URLs never needs this many entries. Past it the builder is looping
// without bound, so throw and fail the test rather than hang the worker.
const MAX_INDEX_ENTRIES = 10_000

function createResolvers(): NitroUrlResolvers {
  let emitted = 0
  return {
    // no event, so buildSitemapIndex skips the cached path
    event: undefined as unknown as NitroUrlResolvers['event'],
    // called once per index entry
    canonicalUrlResolver: (path) => {
      if (++emitted > MAX_INDEX_ENTRIES)
        throw new Error(`runaway: sitemap index emitted more than ${MAX_INDEX_ENTRIES} entries for ${urls.length} URLs`)
      return `https://example.com${path}`
    },
    relativeBaseUrlResolver: path => path,
    fixSlashes: path => path,
  }
}

// Mirrors the runtime config module.ts builds for `sitemaps: true`.
function createRuntimeConfig(defaultSitemapsChunkSize: number | false) {
  return {
    sitemapsPathPrefix: '/__sitemap__/',
    autoLastmod: false,
    defaultSitemapsChunkSize,
    sitemaps: {
      index: { sitemapName: 'index', sitemaps: [] },
      chunks: { sitemapName: 'chunks', includeAppSources: true },
    },
  } as unknown as ModuleRuntimeConfig
}

describe('sitemap index with automatic chunking', () => {
  it('emits a finite index when defaultSitemapsChunkSize is false', async () => {
    const { entries } = await buildSitemapIndex(createResolvers(), createRuntimeConfig(false))

    expect(entries.map(entry => entry.sitemap)).toEqual([
      'https://example.com/__sitemap__/0.xml',
      'https://example.com/__sitemap__/1.xml',
      'https://example.com/__sitemap__/2.xml',
    ])
  })

  it('lists exactly the chunks the child sitemap handler serves', async () => {
    const runtimeConfig = createRuntimeConfig(false)
    const { entries } = await buildSitemapIndex(createResolvers(), runtimeConfig)

    // buildSitemapUrls slices with `defaultSitemapsChunkSize || undefined`
    const chunkLengths = entries.map(entry =>
      sliceUrlsForChunk(urls, entry._sitemapName!, runtimeConfig.sitemaps, runtimeConfig.defaultSitemapsChunkSize || undefined).length,
    )

    expect(chunkLengths.every(length => length > 0)).toBe(true)
    expect(chunkLengths.reduce((total, length) => total + length, 0)).toBe(urls.length)
  })

  it('uses a numeric defaultSitemapsChunkSize as the chunk size', async () => {
    const { entries } = await buildSitemapIndex(createResolvers(), createRuntimeConfig(500))

    expect(entries).toHaveLength(5)
  })
})
