import type { Nuxt } from '@nuxt/schema'
import { describe, expect, it } from 'vitest'
import { generateExtraRoutesFromNuxtConfig } from '../../src/utils-internal/nuxtSitemap'

function nuxtWithRouteRules(routeRules: Record<string, Record<string, unknown>>) {
  return { options: { routeRules } } as unknown as Nuxt
}

describe('generateExtraRoutesFromNuxtConfig robots', () => {
  it('skips route rules whose robots value blocks indexing', () => {
    const { routeRules } = generateExtraRoutesFromNuxtConfig(nuxtWithRouteRules({
      '/private': { robots: false },
      '/hidden': { robots: 'noindex, nofollow' },
      '/none': { robots: 'none' },
      '/public': { robots: 'index, follow' },
      '/plain': { prerender: true },
    }))
    expect(routeRules).toEqual(['/public', '/plain'])
  })
})
