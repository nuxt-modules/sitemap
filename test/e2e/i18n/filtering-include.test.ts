import { describe, expect, it } from 'vitest'
import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'

const { resolve } = createResolver(import.meta.url)

// With i18n + includeAppSources, sitemaps are automatically expanded to per-locale sitemaps
// The include filter is applied to each locale sitemap
await setup({
  rootDir: resolve('../../fixtures/i18n'),
  nuxtConfig: {
    sitemap: {
      sitemaps: {
        main: {
          includeAppSources: true,
          include: ['/', '/test'],
        },
      },
    },
  },
})
describe('i18n filtering with include', () => {
  it('generates per-locale sitemaps with include filter applied', async () => {
    // With the fix for #486, includeAppSources sitemaps are expanded to locale sitemaps
    const index = await $fetch('/sitemap_index.xml')
    expect(index).toContain('en-US.xml')
    expect(index).toContain('fr-FR.xml')
    expect(index).toContain('es-ES.xml')
    // main.xml should NOT exist - it's expanded to locale sitemaps
    expect(index).not.toContain('main.xml')

    // English sitemap should have filtered URLs with alternatives
    const enSitemap = await $fetch('/__sitemap__/en-US.xml')
    expect(enSitemap).toContain('/en')
    expect(enSitemap).toContain('/en/test')
    expect(enSitemap).toContain('hreflang')
    expect(enSitemap).toContain('x-default')

    // French sitemap should have filtered URLs with alternatives
    const frSitemap = await $fetch('/__sitemap__/fr-FR.xml')
    expect(frSitemap).toContain('/fr')
    expect(frSitemap).toContain('/fr/test')
    expect(frSitemap).toContain('hreflang')
  }, 60000)
})
