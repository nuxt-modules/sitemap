import { describe, expect, it } from 'vitest'
import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../../fixtures/issue-504'),
  server: true,
})

describe('issue #504 - duplicate API calls with includeAppSources', () => {
  it('should only call API source once per sitemap request', async () => {
    // Get initial count before first request
    const initial = await $fetch<{ count: number }>('/api/__sitemap__/call-count')
    const startCount = initial.count

    // First request to sitemap - should only increment by 1
    await $fetch('/test.xml')
    const after1 = await $fetch<{ count: number }>('/api/__sitemap__/call-count')
    expect(after1.count - startCount).toBe(1)

    // Second request to sitemap - should only increment by 1, not N+1
    await $fetch('/test.xml')
    const after2 = await $fetch<{ count: number }>('/api/__sitemap__/call-count')
    expect(after2.count - after1.count).toBe(1)

    // Third request to sitemap - should only increment by 1, not N+1
    await $fetch('/test.xml')
    const after3 = await $fetch<{ count: number }>('/api/__sitemap__/call-count')
    expect(after3.count - after2.count).toBe(1)
  }, 60000)
})
