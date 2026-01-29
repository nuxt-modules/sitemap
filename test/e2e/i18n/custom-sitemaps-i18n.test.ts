import { describe, expect, it } from 'vitest'
import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'

const { resolve } = createResolver(import.meta.url)

// Test for issue #486: Automatic I18n Multi Sitemap + custom sitemaps not working
await setup({
  rootDir: resolve('../../fixtures/i18n'),
  nuxtConfig: {
    sitemap: {
      sitemaps: {
        pages: {
          // This should be expanded to per-locale sitemaps (en-US, es-ES, fr-FR)
          includeAppSources: true,
          exclude: ['/secret/**'],
        },
        custom: {
          // This should stay as a single sitemap
          sources: ['/__sitemap'],
        },
      },
    },
  },
})

describe('i18n with custom sitemaps (#486)', () => {
  it('generates sitemap index with locale sitemaps and custom sitemap', async () => {
    const index = await $fetch('/sitemap_index.xml')

    // Should have locale sitemaps (en-US, es-ES, fr-FR) plus the custom sitemap
    expect(index).toContain('en-US.xml')
    expect(index).toContain('es-ES.xml')
    expect(index).toContain('fr-FR.xml')
    expect(index).toContain('custom.xml')

    // Should NOT have a "pages" sitemap (it should be expanded to locales)
    expect(index).not.toContain('pages.xml')
  })

  it('locale sitemap inherits exclude config from custom sitemap', async () => {
    const enSitemap = await $fetch('/__sitemap__/en-US.xml')

    // Should have normal pages
    expect(enSitemap).toContain('/en')

    // The exclude pattern should be applied (no /secret/** URLs)
    expect(enSitemap).not.toContain('/secret')
  })

  it('custom sitemap without includeAppSources stays separate', async () => {
    const customSitemap = await $fetch('/__sitemap__/custom.xml')

    // Should have content from the source
    expect(customSitemap).toContain('urlset')
  })

  it('locale sitemaps have proper i18n alternatives', async () => {
    const frSitemap = await $fetch('/__sitemap__/fr-FR.xml')

    // Should have French URLs with alternatives
    expect(frSitemap).toContain('/fr')
    expect(frSitemap).toContain('hreflang')
    expect(frSitemap).toContain('x-default')
  })
}, 60000)
