import { createResolver } from '@nuxt/kit'
import { fetch, setup } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../../fixtures/basic'),
  nuxtConfig: {
    app: {
      baseURL: '/test',
    },
    sitemap: {
      sitemaps: true,
    },
  },
})

describe('issue 564 - base URL in sitemap redirect with multi sitemaps', () => {
  it('redirects /test/sitemap.xml to /test/sitemap_index.xml', async () => {
    const response = await fetch('/test/sitemap.xml', { redirect: 'manual' })
    expect(response.status).toBe(307)
    const location = response.headers.get('location')
    expect(location).toContain('/test/sitemap_index.xml')
    expect(location).not.toBe('/sitemap_index.xml')
  }, 60000)
})
