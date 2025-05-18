import { describe, expect, it } from 'vitest'
import { resolveSitemapSources } from '../../src/runtime/server/sitemap/urlset/sources'

describe('sources performance features', () => {
  it('should handle already-resolved sources immediately', async () => {
    const sources = [
      // Already resolved source
      {
        context: { name: 'test' },
        urls: ['/page1', '/page2'],
        error: undefined,
      },
      // Unresolved source
      {
        context: { name: 'test2' },
        fetch: undefined, // Will trigger error path
      },
    ]

    const result = await resolveSitemapSources(sources as any)

    expect(result).toHaveLength(2)
    expect(result[0].urls).toEqual(['/page1', '/page2'])
    expect(result[0].timeTakenMs).toBe(0)
    expect(result[1].error).toBe('Invalid source')
  })

  it('should process sources in batches', async () => {
    // Create many unresolved sources
    const sources = Array.from({ length: 15 }, (_, i) => ({
      context: { name: `source-${i}` },
      fetch: undefined, // Will trigger error path
    }))

    // Add one resolved source at the beginning
    sources.unshift({
      context: { name: 'resolved' },
      urls: ['/resolved'],
      error: undefined,
    } as any)

    const result = await resolveSitemapSources(sources as any)

    expect(result).toHaveLength(16)
    expect(result[0].urls).toEqual(['/resolved'])
    // All unresolved sources should have errors
    expect(result.slice(1).every(r => r.error === 'Invalid source')).toBe(true)
  })
})
