import { describe, expect, it } from 'vitest'
import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../../fixtures/basic'),
})

describe('definePageMeta sitemap', () => {
  it('applies sitemap meta from definePageMeta to output', async () => {
    const sitemap = await $fetch<string>('/sitemap.xml')
    // about.vue has definePageMeta({ sitemap: { priority: 0.8, changefreq: 'daily' } })
    expect(sitemap).toContain('<loc>https://nuxtseo.com/about</loc>')
    expect(sitemap).toContain('<changefreq>daily</changefreq>')
    expect(sitemap).toContain('<priority>0.8</priority>')
  }, 60000)
})
