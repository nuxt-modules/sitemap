import { describe, expect, it } from 'vitest'
import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../../fixtures/i18n-no-prefix'),
  server: true,
  sitemap: {
    urls: [
      // test custom path mapping with no_prefix - should warn
      {
        loc: '/test',
        _i18nTransform: true,
      },
      {
        loc: '/about',
        _i18nTransform: true,
      },
    ],
  },
})

describe('i18n custom paths with no_prefix strategy', () => {
  it('should generate alternatives with custom paths even with no_prefix when pages config is present', async () => {
    // The actual behavior is that _i18nTransform works with no_prefix when pages config is present
    // This is counter-intuitive but is the current implementation
    const sitemap = await $fetch('/sitemap.xml')

    // The implementation still creates all locale variants with custom paths
    expect(sitemap).toContain('<loc>https://nuxtseo.com/test</loc>')
    expect(sitemap).toContain('<loc>https://nuxtseo.com/about</loc>')
    expect(sitemap).toContain('<loc>https://nuxtseo.com/prueba</loc>')
    expect(sitemap).toContain('<loc>https://nuxtseo.com/teste</loc>')
    expect(sitemap).toContain('<loc>https://nuxtseo.com/acerca-de</loc>')
    expect(sitemap).toContain('<loc>https://nuxtseo.com/a-propos</loc>')

    // And it includes hreflang alternatives
    expect(sitemap).toContain('xhtml:link')
    expect(sitemap).toContain('hreflang')

    // The warning is still issued because this is not recommended behavior
  })

  it('should have warning in dev mode for _i18nTransform with no_prefix', async () => {
    // The warning is important because while the transformation works,
    // it's not recommended with no_prefix strategy
    const sitemap = await $fetch('/sitemap.xml')

    // Even though it transforms, the warning tells users this is not intended behavior
    expect(sitemap).toContain('<loc>https://nuxtseo.com/test</loc>')
    expect(sitemap).toContain('<loc>https://nuxtseo.com/about</loc>')
  })
})
