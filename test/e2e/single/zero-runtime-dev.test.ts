import { readFile } from 'node:fs/promises'
import { buildNuxt, createResolver, loadNuxt } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../../fixtures/basic'),
  dev: true,
  nuxtConfig: {
    sitemap: {
      zeroRuntime: true,
    },
  },
})

describe.skipIf(process.env.CI)('zero runtime dev', () => {
  it('serves sitemap in dev mode', async () => {
    // zeroRuntime handlers still work in dev (import.meta.dev === true)
    // In dev mode, URLs use the local origin rather than the configured site URL
    const sitemap = await $fetch('/sitemap.xml')
    expect(sitemap).toContain('<urlset')
    expect(sitemap).toContain('<loc>')
    expect(sitemap).toContain('/about')
  }, 60000)
})
