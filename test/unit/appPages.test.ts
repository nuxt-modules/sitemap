import type { Nuxt, NuxtPage } from '@nuxt/schema'
import { describe, expect, it } from 'vitest'
import { createAppPagesReader } from '../../src/utils-internal/appPages'

function fixture(pages?: NuxtPage[]) {
  let onResolved: (pages: NuxtPage[]) => void
  const nuxt = {
    options: { pages: { enabled: true } },
    apps: { default: { pages } },
    hooks: { hook: (_name: string, callback: typeof onResolved) => { onResolved = callback } },
  }
  return { nuxt: nuxt as unknown as Nuxt, resolve: (pages: NuxtPage[]) => onResolved(pages) }
}

describe('app page source reader', () => {
  it('allows early source inspection before Nuxt resolves pages', () => {
    const { nuxt } = fixture()
    const readPages = createAppPagesReader(nuxt)
    expect(readPages()).toEqual([])
  })

  it('keeps pages already resolved before module setup', () => {
    const { nuxt } = fixture([{ path: '/existing' }])
    const readPages = createAppPagesReader(nuxt)
    expect(readPages().map(page => page.path)).toEqual(['/existing'])
  })

  it('reads new pages and removals on every development update', () => {
    const { nuxt, resolve } = fixture([{ path: '/old' }])
    const readPages = createAppPagesReader(nuxt)
    resolve([{ path: '/' }, { path: '/added' }])
    expect(readPages().map(page => page.path)).toEqual(['/', '/added'])
    resolve([{ path: '/' }])
    expect(readPages().map(page => page.path)).toEqual(['/'])
  })

  it.each([false, { enabled: false }] as const)('does not expose stale app pages when pages are %j', (pages) => {
    const { nuxt } = fixture([{ path: '/old' }])
    nuxt.options.pages = pages
    expect(createAppPagesReader(nuxt)()).toEqual([])
  })
})
