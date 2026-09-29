import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../../fixtures/content-v3-define-schema'),
  build: true,
})

describe('nuxt/content v3 defineSitemapSchema', () => {
  it('includes content with sitemap schema', async () => {
    const urls = await $fetch<any[]>('/__sitemap__/nuxt-content-urls.json')
    const paths = urls.map(u => u.loc)

    expect(paths).toContain('/foo')
    expect(paths).toContain('/bar')
    expect(paths).toContain('/published')
  })

  it('filters content entries using defineSitemapSchema filter', async () => {
    const urls = await $fetch<any[]>('/__sitemap__/nuxt-content-urls.json')
    const paths = urls.map(u => u.loc)

    // draft.md (draft: true) should be excluded
    expect(paths).not.toContain('/draft')
    // future.md (date: 2099-01-01) should be excluded
    expect(paths).not.toContain('/future')
  })

  it('preserves sitemap frontmatter values', async () => {
    const urls = await $fetch<any[]>('/__sitemap__/nuxt-content-urls.json')
    const foo = urls.find(u => u.loc === '/foo')
    expect(foo).toBeDefined()
    expect(foo.priority).toBe(0.5)
  })

  it('runs a method shorthand onUrl', async () => {
    const urls = await $fetch<any[]>('/__sitemap__/nuxt-content-urls.json')
    expect(urls.find(u => u.loc === '/bar')?.changefreq).toBe('weekly')
    expect(urls.find(u => u.loc === '/foo')?.changefreq).toBeUndefined()
  })

  it('excludes pages whose robots frontmatter blocks indexing', async () => {
    const urls = await $fetch<any[]>('/__sitemap__/nuxt-content-urls.json')
    const paths = urls.map(u => u.loc)
    expect(paths).not.toContain('/robots-false')
    expect(paths).not.toContain('/robots-noindex')
    expect(paths).not.toContain('/robots-noindex-nofollow')
    expect(paths).toContain('/robots-index-nofollow')
  })
})
