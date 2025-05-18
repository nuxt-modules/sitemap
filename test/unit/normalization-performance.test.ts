import { describe, expect, it } from 'vitest'
import { normaliseEntry } from '../../src/runtime/server/sitemap/urlset/normalise'

describe('normalisation performance features', () => {
  it('should not re-normalize entries marked as normalized', () => {
    const entry: any = {
      loc: '/test',
      _key: '/test',
      _normalized: true,
    }

    const result = normaliseEntry(entry, {}, undefined)

    // If early exit works, the object should be identical (not a new object)
    expect(result).toBe(entry)
  })

  it('should take fast path for simple entries', () => {
    const simpleEntry: any = {
      loc: '/simple',
      _key: '/simple',
    }

    const result = normaliseEntry(simpleEntry, {}, undefined)

    expect(result.loc).toBe('/simple')
    expect(result._normalized).toBe(true)
    // Should not have lastmod, images, etc from defaults as we took the fast path
    expect(result.lastmod).toBeUndefined()
  })

  it('should apply full normalization for complex entries', () => {
    const complexEntry: any = {
      loc: '/complex',
      _key: '/complex',
      lastmod: '2023-01-01',
    }

    const defaults = {
      priority: 0.5,
    }

    const result = normaliseEntry(complexEntry, defaults, undefined)

    expect(result.loc).toBe('/complex')
    expect(result._normalized).toBe(true)
    expect(result.priority).toBe(0.5)
    expect(result.lastmod).toBe('2023-01-01')
  })
})
