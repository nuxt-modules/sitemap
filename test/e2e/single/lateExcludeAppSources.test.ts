import { createResolver, defineNuxtModule } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

// Modules that load after @nuxtjs/sitemap only ever see `nuxt.options.sitemap`.
// `defineNuxtModule` hands each module its own resolved copy, so this exclusion
// cannot reach the config the sitemap module already resolved.
const excludePagesLate = defineNuxtModule({
  meta: { name: 'test-late-exclude' },
  setup(_options, nuxt) {
    const sitemap = (nuxt.options as { sitemap?: { excludeAppSources?: string[] } }).sitemap
    sitemap!.excludeAppSources = [...(sitemap!.excludeAppSources ?? []), 'nuxt:pages']
  },
})

await setup({
  rootDir: resolve('../../fixtures/basic'),
  nuxtConfig: {
    modules: [excludePagesLate],
    sitemap: {
      excludeAppSources: [],
      urls: ['/only-url'],
    },
  },
})

describe('app sources excluded after setup', () => {
  it('honours an exclusion a later module added', async () => {
    const sitemap = await $fetch('/sitemap.xml')

    expect(sitemap).toContain('<loc>https://nuxtseo.com/only-url</loc>')
    // /about is a static page file, so it can only arrive through nuxt:pages
    expect(sitemap).not.toContain('/about')
  })
})
