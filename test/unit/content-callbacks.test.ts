import { describe, expect, it } from 'vitest'
import { serializeContentCallback } from '../../src/utils-internal/contentCallbacks'

// Build the callback the way the virtual module does, then run it.
function revive<T>(source: string): T {
  // eslint-disable-next-line no-new-func
  return new Function(`return (${source})`)() as T
}

describe('serializeContentCallback', () => {
  it('serializes an arrow function', () => {
    const fn = (entry: { draft?: boolean }) => !entry.draft
    const filter = revive<typeof fn>(serializeContentCallback(fn, { collection: 'blog', kind: 'filter' }))
    expect(filter({ draft: true })).toBe(false)
    expect(filter({})).toBe(true)
  })

  it('serializes a method shorthand', () => {
    const options = {
      onUrl(url: Record<string, unknown>) {
        url.priority = 0.7
      },
    }
    const onUrl = revive<typeof options.onUrl>(serializeContentCallback(options.onUrl, { collection: 'blog', kind: 'onUrl' }))
    const url: Record<string, unknown> = { loc: '/a' }
    onUrl(url)
    expect(url.priority).toBe(0.7)
  })

  it('allows globals and locals declared inside the callback', () => {
    const fn = (entry: { date?: string, tags?: string[] }) => {
      const hidden = new Set(['internal'])
      const isPast = !entry.date || new Date(entry.date).getTime() < Date.now()
      return isPast && !(entry.tags || []).some(tag => hidden.has(tag)) && Math.abs(1) === 1
    }
    const filter = revive<typeof fn>(serializeContentCallback(fn, { collection: 'blog', kind: 'filter' }))
    expect(filter({ tags: ['internal'] })).toBe(false)
    expect(filter({ tags: ['public'] })).toBe(true)
  })

  it('throws naming the collection and the captured variable', () => {
    const HIDDEN = ['/secret']
    const fn = (entry: { path: string }) => !HIDDEN.includes(entry.path)
    expect(() => serializeContentCallback(fn, { collection: 'blog', kind: 'filter' }))
      .toThrow(/`filter` callback of collection "blog" reads `HIDDEN`/)
  })

  it('names every captured variable once', () => {
    const prefix = '/docs'
    const priority = 0.5
    const options = {
      onUrl(url: Record<string, unknown>) {
        url.loc = `${prefix}${url.loc}`
        url.priority = priority
        url.changefreq = prefix ? 'daily' : 'weekly'
      },
    }
    expect(() => serializeContentCallback(options.onUrl, { collection: 'docs', kind: 'onUrl' }))
      .toThrow(/reads `prefix`, `priority`/)
  })
})
