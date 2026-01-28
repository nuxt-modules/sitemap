import { describe, expect, it } from 'vitest'
import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../../fixtures/content-v3-filtering'),
  build: true,
})

describe('nuxt/content v3 filtering', () => {
  it('filters content entries using collection filter', async () => {
    const urls = await $fetch<any[]>('/__sitemap__/nuxt-content-urls.json')
    const paths = urls.map(u => u.loc)

    // draft.md (draft: true) should be excluded
    expect(paths).not.toContain('/draft')
    // future.md (date: 2099-01-01) should be excluded
    expect(paths).not.toContain('/future')

    // published.md (date in past, draft: false) should be included
    expect(paths).toContain('/published')
    // regular posts without draft/date fields should be included
    expect(paths).toContain('/foo')
    expect(paths).toContain('/bar')
  })
})
