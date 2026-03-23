import { createResolver } from '@nuxt/kit'
import { $fetch, fetch, setup } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../../fixtures/issue-384'),
})

describe('issue #384 - sitemap with robots disallow /', () => {
  it('should still generate sitemap URLs when robots disallows everything', async () => {
    const sitemap = await $fetch('/sitemap.xml')
    expect(sitemap).toContain('https://nuxtseo.com/')
    expect(sitemap).toContain('https://nuxtseo.com/about')
  }, 60000)

  it('should block crawlers from the sitemap via X-Robots-Tag', async () => {
    const res = await fetch('/sitemap.xml')
    expect(res.headers.get('x-robots-tag')).toBe('noindex, nofollow')
  }, 60000)
})
