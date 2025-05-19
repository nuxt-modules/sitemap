import { describe, it, expect } from 'vitest'
import { createResolver } from '@nuxt/kit'
import { setup, $fetch } from '@nuxt/test-utils'

const { resolve } = createResolver(import.meta.url)

describe('sitemap:sources hook', async () => {
  await setup({
    rootDir: resolve('../../fixtures/sources-hook'),
    server: true,
  })

  it('can add new sources dynamically', async () => {
    const sitemap = await $fetch('/sitemap.xml')

    // Should have URLs from the dynamically added source
    expect(sitemap).toContain('<loc>https://example.com/dynamic-source-url</loc>')
  })

  it('can modify existing sources', async () => {
    const sitemap = await $fetch('/sitemap.xml')

    // Should have URLs showing the headers were modified
    expect(sitemap).toContain('<loc>https://example.com/hook-modified</loc>')
  })

  it('can filter out sources', async () => {
    const sitemap = await $fetch('/sitemap.xml')

    // The skipped source should not appear in the sitemap
    expect(sitemap).not.toContain('<loc>https://example.com/should-be-filtered</loc>')
  })
})
