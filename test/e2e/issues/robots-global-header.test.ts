import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'
import { expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)
await setup({
  rootDir: resolve('../../fixtures/issue-384'),
  nuxtConfig: {
    routeRules: { '/**': { headers: { 'x-robots-tag': 'noindex' } } },
  },
})

it('preserves explicit global noindex headers when Robots derives transport headers', async () => {
  const sitemap = await $fetch('/sitemap.xml')
  expect(sitemap).toContain('<urlset')
  expect(sitemap).not.toContain('<loc>')
})
