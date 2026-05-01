import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../../fixtures/chunk-cache'),
})

describe('chunk resolved-urls memoization', () => {
  it('all chunks of the same base share one source fetch', async () => {
    // 17 entries × chunk size 5 → 4 chunks (0..3)
    await $fetch('/__sitemap__/posts-0.xml')
    await $fetch('/__sitemap__/posts-1.xml')
    await $fetch('/__sitemap__/posts-2.xml')
    await $fetch('/__sitemap__/posts-3.xml')

    const { count } = await $fetch<{ count: number }>('/api/source-call-count')
    expect(count).toBe(1)
  }, 30000)

  it('chunked output reflects the shared sorted slice', async () => {
    const chunk0 = await $fetch<string>('/__sitemap__/posts-0.xml')
    const chunk3 = await $fetch<string>('/__sitemap__/posts-3.xml')

    expect(chunk0).toContain('/posts/1')
    expect(chunk0).toContain('/posts/5')
    expect(chunk0).not.toContain('/posts/6')

    expect(chunk3).toContain('/posts/16')
    expect(chunk3).toContain('/posts/17')
    expect(chunk3).not.toContain('/posts/15')
  }, 30000)
})
