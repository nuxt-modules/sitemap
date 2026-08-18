import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../../fixtures/source-shared'),
})

describe('shared sitemap sources', () => {
  it('fetches a shared source once, not once per sitemap', async () => {
    const posts = await $fetch<string>('/__sitemap__/posts.xml')
    const pages = await $fetch<string>('/__sitemap__/pages.xml')

    expect(posts).toContain('https://nuxtseo.com/posts/1')
    expect(pages).toContain('https://nuxtseo.com/posts/1')

    const { count } = await $fetch<{ count: number }>('/api/source-call-count')
    expect(count).toBe(1)
  }, 30000)
})
