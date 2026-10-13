import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../../fixtures/comark-content'),
  nuxtConfig: {
    sitemap: {
      contentLastmod: false,
    },
  },
})

describe('comark-content with contentLastmod off', () => {
  it('reads no frontmatter dates and keeps an explicit sitemap.lastmod', async () => {
    const urls = await $fetch<{ loc: string, lastmod?: string }[]>('/__sitemap__/comark-content-urls.json')
    expect(urls.find(url => url.loc === '/posts/published')).toEqual({ loc: '/posts/published' })
    expect(urls.find(url => url.loc === '/bar')?.lastmod).toBe('2021-10-20')
  }, 60000)
})
