import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../../fixtures/issue-588'),
  server: true,
  dev: false,
})

describe('issue #588 - useHead hreflang should not leak into sitemap when autoI18n: false', () => {
  it('should not contain hreflang alternates from useHead()', async () => {
    const sitemap = await $fetch('/sitemap.xml')

    // should contain all pages
    expect(sitemap).toContain('https://example.com/')
    expect(sitemap).toContain('https://example.com/about')
    expect(sitemap).toContain('https://example.com/contact')

    // autoI18n: false should suppress hreflang alternatives even when added via useHead()
    expect(sitemap).not.toContain('xhtml:link')
    expect(sitemap).not.toContain('hreflang')
    expect(sitemap).not.toContain('example.de')
    expect(sitemap).not.toContain('example.fr')
    expect(sitemap).not.toContain('example.it')
  }, 60000)
})
