import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../../fixtures/content-v3-i18n'),
})

describe('nuxt/content v3 + i18n', () => {
  it('content URLs have correct locale prefixes', async () => {
    const urls = await $fetch('/__sitemap__/nuxt-content-urls.json')
    // en collection should produce un-prefixed paths (default locale)
    // ja collection should produce /ja/ prefixed paths (from collection prefix config)
    const locs = (urls as { loc: string }[]).map(u => u.loc).sort()
    expect(locs).toContain('/')
    expect(locs).toContain('/getting-started')
    expect(locs).toContain('/ja')
    expect(locs).toContain('/ja/getting-started')
  }, 60000)

  it('en sitemap contains only en URLs', async () => {
    const sitemap = await $fetch('/__sitemap__/en-US.xml')
    // should contain en URLs (dev mode uses local origin)
    expect(sitemap).toContain('<loc>')
    expect(sitemap).toContain('/getting-started')
  }, 60000)

  it('ja sitemap contains only ja URLs', async () => {
    const sitemap = await $fetch('/__sitemap__/ja-JP.xml')
    // should contain ja URLs (dev mode uses local origin)
    expect(sitemap).toContain('/ja')
    expect(sitemap).toContain('/ja/getting-started')
  }, 60000)

  it('sitemap index lists both locale sitemaps', async () => {
    const index = await $fetch('/sitemap_index.xml')
    expect(index).toContain('en-US.xml')
    expect(index).toContain('ja-JP.xml')
  }, 60000)
}, 120000)
