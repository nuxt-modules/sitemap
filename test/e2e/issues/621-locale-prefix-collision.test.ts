import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

// https://github.com/nuxt-modules/sitemap/issues/621
await setup({
  rootDir: resolve('../../fixtures/issue-621'),
  server: true,
})

// extract the primary `<loc>` entries (ignoring hreflang alternative links,
// which legitimately reference the sibling locale's URLs)
function locs(xml: string): string[] {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]!)
}

describe('issue #621 - locale sitemap prefix collisions', () => {
  it('zh-Hant sitemap only lists /tw URLs, not /zh URLs', async () => {
    const entries = locs(await $fetch('/__sitemap__/zh-Hant.xml'))
    expect(entries).toContain('https://nuxtseo.com/tw/about')
    expect(entries).toContain('https://nuxtseo.com/tw/contact')
    // the bug: /zh URLs (sitemap `zh`) leaked into the `zh-Hant` sitemap
    expect(entries).not.toContain('https://nuxtseo.com/zh/about')
    expect(entries).not.toContain('https://nuxtseo.com/zh/contact')
  }, 60000)

  it('zh sitemap only lists /zh URLs', async () => {
    const entries = locs(await $fetch('/__sitemap__/zh.xml'))
    expect(entries).toContain('https://nuxtseo.com/zh/about')
    expect(entries).toContain('https://nuxtseo.com/zh/contact')
    expect(entries).not.toContain('https://nuxtseo.com/tw/about')
    expect(entries).not.toContain('https://nuxtseo.com/tw/contact')
  }, 60000)
}, 60000)
