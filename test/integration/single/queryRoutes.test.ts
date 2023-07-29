import { describe, expect, it } from 'vitest'
import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../../fixtures/basic'),
  nuxtConfig: {
    sitemap: {
      urls: [
        '/',
        '/query-no-slash?foo=bar',
        '/query-slash/?foo=bar',
        '/query-slash-hash/?foo=bar#hash',
      ],
    },
  },
})
describe('query routes', () => {
  it('basic', async () => {
    const sitemap = await $fetch('/sitemap.xml')

    expect(sitemap).toContain('<loc>https://nuxtseo.com/query-no-slash?foo=bar</loc>')
    expect(sitemap).toContain('<loc>https://nuxtseo.com/query-slash?foo=bar</loc>')
    expect(sitemap).toContain('<loc>https://nuxtseo.com/query-slash-hash?foo=bar#hash</loc>')
  }, 60000)
})
