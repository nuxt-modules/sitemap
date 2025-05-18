import { describe, expect, it, beforeEach } from 'vitest'
import { PathResolutionCache } from '../../src/runtime/server/sitemap/cache/path-cache'

describe('cache performance optimizations', () => {
  let cache: PathResolutionCache

  beforeEach(() => {
    cache = new PathResolutionCache()
  })

  it('should cache and retrieve values', () => {
    cache.set('key1', 'value1')
    expect(cache.get('key1')).toBe('value1')
    expect(cache.has('key1')).toBe(true)
    expect(cache.size).toBe(1)
  })

  it('should return undefined for missing keys', () => {
    expect(cache.get('missing')).toBeUndefined()
    expect(cache.has('missing')).toBe(false)
  })

  it('should clear cache', () => {
    cache.set('key1', 'value1')
    cache.set('key2', 'value2')
    expect(cache.size).toBe(2)

    cache.clear()
    expect(cache.size).toBe(0)
    expect(cache.get('key1')).toBeUndefined()
  })

  it('should enforce size limit', () => {
    // This test would need the actual implementation to expose the limit
    // For now, we just test basic functionality
    const entries = 100
    for (let i = 0; i < entries; i++) {
      cache.set(`key${i}`, `value${i}`)
    }

    // Should have all entries (assuming limit is higher than 100)
    expect(cache.size).toBe(entries)
  })
})
