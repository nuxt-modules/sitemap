import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../../fixtures/multi-with-chunks'),
  server: true,
  nuxtConfig: {
    sitemap: {
      minify: true,
    },
  },
})

describe('minified sitemap index', () => {
  it('omits formatting whitespace without changing entries', async () => {
    const index = await $fetch<string>('/sitemap_index.xml')

    expect(index).not.toContain('\n')
    expect(index).toContain('</sitemap><sitemap>')
    expect(index).toContain('<loc>https://nuxtseo.com/__sitemap__/pages.xml</loc>')
    expect(index).toContain('<loc>https://nuxtseo.com/__sitemap__/posts-0.xml</loc>')
  })
})
