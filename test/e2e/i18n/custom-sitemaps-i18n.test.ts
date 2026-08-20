import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

// Test for issue #486: Automatic I18n Multi Sitemap + custom sitemaps not working
// Test for issue #617: custom sitemap config (sources, urls, defaults) lost during i18n expansion
await setup({
  rootDir: resolve('../../fixtures/i18n'),
  nuxtConfig: {
    sitemap: {
      sitemaps: {
        pages: {
          // This should be expanded to per-locale sitemaps (en-US, es-ES, fr-FR)
          includeAppSources: true,
          exclude: ['/secret/**'],
          // #617: dynamic sources must be preserved on each generated locale sitemap
          sources: ['/api/sitemap-urls'],
          // #617: statically configured urls must be preserved too
          urls: [
            { loc: '/static-config-page', _i18nTransform: true },
          ],
          // #617: URL defaults must be preserved on each generated locale sitemap
          defaults: {
            priority: 0.7,
            changefreq: 'weekly',
          },
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

describe('i18n with custom sitemaps preserves config (#617)', () => {
  it('locale sitemap inherits dynamic `sources` from custom sitemap', async () => {
    const enSitemap = await $fetch('/__sitemap__/en-US-pages.xml')

    // This URL can only come from the `sources` endpoint, never from page discovery
    expect(enSitemap).toContain('/en/dynamic-source-page')
  })

  it('inherits `sources` for every generated locale sitemap', async () => {
    const frSitemap = await $fetch('/__sitemap__/fr-FR-pages.xml')
    const esSitemap = await $fetch('/__sitemap__/es-ES-pages.xml')

    expect(frSitemap).toContain('/fr/dynamic-source-page')
    expect(esSitemap).toContain('/es/dynamic-source-page')
  })

  it('locale sitemap inherits URL `defaults` from custom sitemap', async () => {
    const enSitemap = await $fetch('/__sitemap__/en-US-pages.xml')

    expect(enSitemap).toContain('<priority>0.7</priority>')
    expect(enSitemap).toContain('<changefreq>weekly</changefreq>')
  })

  it('locale sitemap inherits statically configured `urls`', async () => {
    const enSitemap = await $fetch('/__sitemap__/en-US-pages.xml')

    expect(enSitemap).toContain('/en/static-config-page')
  })

  it('does not leak the source URL into unrelated sitemaps', async () => {
    // `custom` has its own sources and must not pick up the `pages` source
    const customSitemap = await $fetch('/__sitemap__/custom.xml')

    expect(customSitemap).not.toContain('/dynamic-source-page')
  })
}, 60000)
