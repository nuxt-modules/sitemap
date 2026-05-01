import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../../fixtures/chunk-count'),
})

describe('declared chunkCount', () => {
  it('renders the index from the declared count without hitting the source', async () => {
    const before = (await $fetch<{ count: number }>('/api/posts-call-count')).count
    const indexXml = await $fetch<string>('/sitemap_index.xml')
    const after = (await $fetch<{ count: number }>('/api/posts-call-count')).count

    expect(after - before).toBe(0)

    for (let i = 0; i < 4; i++) {
      expect(indexXml).toContain(`/__sitemap__/posts-${i}.xml`)
    }
    expect(indexXml).not.toContain('/__sitemap__/posts-4.xml')
  }, 30000)

  it('chunks fetch sources on demand and the data is correct', async () => {
    const chunk0 = await $fetch<string>('/__sitemap__/posts-0.xml')
    expect(chunk0).toContain('/posts/1')
    expect(chunk0).toContain('/posts/5')
  }, 30000)
})
