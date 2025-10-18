import { describe, expect, it } from 'vitest'
import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../../fixtures/content-v3'),
})

describe('nuxt/content v3 filtering', () => {
  it('filters draft posts', async () => {
    const nuxtContentUrls = await $fetch<any[]>('/__sitemap__/nuxt-content-urls.json')
    const paths = nuxtContentUrls.map(u => u.loc)

    // draft.md should be filtered out
    expect(paths).not.toContain('/draft')
  })

  it('filters future posts', async () => {
    const nuxtContentUrls = await $fetch<any[]>('/__sitemap__/nuxt-content-urls.json')
    const paths = nuxtContentUrls.map(u => u.loc)

    // future.md should be filtered out
    expect(paths).not.toContain('/future')
  })

  it('includes published posts', async () => {
    const nuxtContentUrls = await $fetch<any[]>('/__sitemap__/nuxt-content-urls.json')
    const paths = nuxtContentUrls.map(u => u.loc)

    // published.md should be included
    expect(paths).toContain('/published')
  })

  it('includes regular posts without draft/date fields', async () => {
    const nuxtContentUrls = await $fetch<any[]>('/__sitemap__/nuxt-content-urls.json')
    const paths = nuxtContentUrls.map(u => u.loc)

    // regular posts should still be included
    expect(paths).toContain('/foo')
    expect(paths).toContain('/bar')
  })

  it('total count reflects filtering', async () => {
    const nuxtContentUrls = await $fetch<any[]>('/__sitemap__/nuxt-content-urls.json')

    // should have filtered out 2 items (draft + future)
    // original has: bar, draft, foo, future, posts/bar, posts/fallback, posts/foo, published, test-json, test-yaml = 10
    // filtered: 10 - 2 = 8
    expect(nuxtContentUrls.length).toBe(8)
  })
})
