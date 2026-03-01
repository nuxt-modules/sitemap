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
  it('generates sitemap index with locale-prefixed sitemaps and custom sitemap', async () => {
    const index = await $fetch('/sitemap_index.xml')

    // Should have locale-prefixed sitemaps: {locale}-{name} format
    expect(index).toContain('en-US-pages.xml')
    expect(index).toContain('es-ES-pages.xml')
    expect(index).toContain('fr-FR-pages.xml')
    expect(index).toContain('custom.xml')

    // Should NOT have unprefixed "pages" or plain locale sitemaps
    expect(index).not.toMatch(/\/pages\.xml/)
    expect(index).not.toMatch(/\/en-US\.xml[^-]/)
  })

  it('locale sitemap inherits exclude config from custom sitemap', async () => {
    const enSitemap = await $fetch('/__sitemap__/en-US-pages.xml')

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
    const frSitemap = await $fetch('/__sitemap__/fr-FR-pages.xml')

    // Should have French URLs with alternatives
    expect(frSitemap).toContain('/fr')
    expect(frSitemap).toContain('hreflang')
    expect(frSitemap).toContain('x-default')
  })
}, 60000)
