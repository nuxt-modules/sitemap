import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../../fixtures/issue-594'),
  server: true,
  dev: true,
})

describe.skipIf(process.env.CI)('issue #594 - multi sitemap links on localhost', () => {
  it('index entries keep a usable http origin when browsed via [::1]', async () => {
    // no site url configured + dev mode: the index must fall back to the nitro origin.
    // regression: nuxt-site-config-kit < 4 mangled [::1] hosts into https://[::1]:3000 links
    const sitemap: string = await $fetch('/sitemap_index.xml', {
      headers: { host: '[::1]:3000' },
    })

    expect(sitemap).toContain('<sitemapindex')
    expect(sitemap).toMatch(/<loc>http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\/__sitemap__\/sitemap-da\.xml<\/loc>/)
    expect(sitemap).toMatch(/<loc>http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\/__sitemap__\/sitemap-en\.xml<\/loc>/)
    expect(sitemap).not.toContain('https://')
    expect(sitemap).not.toContain('[::1]')
  }, 120000)

  it('child sitemaps are served at the paths the index links to', async () => {
    const sitemap: string = await $fetch('/__sitemap__/sitemap-da.xml')
    expect(sitemap).toContain('<urlset')
    expect(sitemap).toContain('/da')
  }, 60000)
})
