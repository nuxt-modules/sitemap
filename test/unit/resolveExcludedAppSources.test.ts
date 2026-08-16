import { describe, expect, it } from 'vitest'
import { resolveExcludedAppSources } from '../../src/utils-internal/nuxtSitemap'

describe('resolveExcludedAppSources', () => {
  it('keeps the resolved exclusions when nothing was authored later', () => {
    expect(resolveExcludedAppSources(['nuxt:pages'], undefined)).toEqual(['nuxt:pages'])
  })

  it('adds an exclusion authored after setup', () => {
    expect(resolveExcludedAppSources([], ['@nuxt/content@v3:urls'])).toEqual(['@nuxt/content@v3:urls'])
  })

  it('unions both lists without duplicating', () => {
    expect(resolveExcludedAppSources(['nuxt:pages'], ['nuxt:pages', 'nuxt:prerender']))
      .toEqual(['nuxt:pages', 'nuxt:prerender'])
  })

  it('excludes everything when either side opts out entirely', () => {
    expect(resolveExcludedAppSources(true, ['nuxt:pages'])).toBe(true)
    expect(resolveExcludedAppSources([], true)).toBe(true)
  })

  it('ignores a malformed authored value rather than dropping the resolved list', () => {
    expect(resolveExcludedAppSources(['nuxt:pages'], 'nuxt:prerender')).toEqual(['nuxt:pages'])
    expect(resolveExcludedAppSources(['nuxt:pages'], [42, 'nuxt:prerender'])).toEqual(['nuxt:pages', 'nuxt:prerender'])
  })
})
