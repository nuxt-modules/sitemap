import { createResolver } from '@nuxt/kit'
import { $fetch, fetch, setup } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../../fixtures/issue-384'),
})

describe('issue #384 - sitemap with robots disallow /', () => {
  it('should still generate sitemap URLs when robots disallows everything', async () => {
    // robots.txt disallow should NOT prevent URLs from appearing in sitemaps
    const config = await $fetch('/api/robot-config')
    expect(config.skipped.indexable).toBe(true)
    expect(config.normal.indexable).toBe(false)
    const sitemap = await $fetch('/sitemap.xml')
    expect(sitemap).toContain('<loc>')
    expect(sitemap).toContain('/about')
    expect(sitemap).not.toContain('<loc>https://nuxtseo.com/private</loc>')
    expect(sitemap).not.toContain('<loc>https://nuxtseo.com/late</loc>')
  }, 60000)

  it('should block crawlers from the sitemap via X-Robots-Tag', async () => {
    const res = await fetch('/sitemap.xml')
    expect(res.headers.get('x-robots-tag')).toBe('noindex, nofollow')
  }, 60000)
})
