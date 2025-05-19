import { describe, expect, it } from 'vitest'
import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../../fixtures/i18n'),
  server: true,
  sitemap: {
    urls: [
      // test custom path mapping
      {
        loc: '/test',
        _i18nTransform: true,
      },
      {
        loc: '/about',
        _i18nTransform: true,
      },
      {
        loc: '/__sitemap/url',
      },
    ],
  },
  nuxtConfig: {
    i18n: {
      locales: [
        {
          code: 'en',
          iso: 'en-US',
        },
        {
          code: 'es',
          iso: 'es-ES',
        },
        {
          code: 'fr',
          iso: 'fr-FR',
        },
      ],
      defaultLocale: 'en',
      strategy: 'prefix_except_default',
      pages: {
        test: {
          en: '/test',
          es: '/prueba',
          fr: '/teste',
        },
        about: {
          en: '/about',
          es: '/acerca-de',
          fr: '/a-propos',
        },
      },
    },
  },
})

describe('i18n custom paths with _i18nTransform', () => {
  it('should use custom paths from pages config for _i18nTransform', async () => {
    // With prefix_except_default, we get separate sitemaps per locale
    const enSitemap = await $fetch('/__sitemap__/en-US.xml')
    const esSitemap = await $fetch('/__sitemap__/es-ES.xml')
    const frSitemap = await $fetch('/__sitemap__/fr-FR.xml')

    // Test that /test with _i18nTransform generates custom paths
    expect(enSitemap).toContain('<loc>https://nuxtseo.com/test</loc>')
    expect(esSitemap).toContain('<loc>https://nuxtseo.com/es/prueba</loc>')
    expect(frSitemap).toContain('<loc>https://nuxtseo.com/fr/teste</loc>')

    // Test about with custom paths
    expect(enSitemap).toContain('<loc>https://nuxtseo.com/about</loc>')
    expect(esSitemap).toContain('<loc>https://nuxtseo.com/es/acerca-de</loc>')
    expect(frSitemap).toContain('<loc>https://nuxtseo.com/fr/a-propos</loc>')

    // Check that alternatives use custom paths in the English sitemap
    expect(enSitemap).toContain('href="https://nuxtseo.com/es/prueba"')
    expect(enSitemap).toContain('href="https://nuxtseo.com/fr/teste"')
  })

  it('should generate correct alternatives for URLs with _i18nTransform', async () => {
    const enSitemap = await $fetch('/__sitemap__/en-US.xml')

    // Check the test URL entry
    const testUrlMatch = enSitemap.match(/<url>[\s\S]*?<loc>https:\/\/nuxtseo\.com\/test<\/loc>[\s\S]*?<\/url>/g)
    expect(testUrlMatch).toBeDefined()

    const testUrl = testUrlMatch![0]
    // Verify it has the correct alternatives with custom paths
    expect(testUrl).toContain('<xhtml:link rel="alternate" hreflang="es-ES" href="https://nuxtseo.com/es/prueba" />')
    expect(testUrl).toContain('<xhtml:link rel="alternate" hreflang="fr-FR" href="https://nuxtseo.com/fr/teste" />')
    expect(testUrl).toContain('<xhtml:link rel="alternate" hreflang="x-default" href="https://nuxtseo.com/test" />')

    // Check the about URL entry
    const aboutUrlMatch = enSitemap.match(/<url>[\s\S]*?<loc>https:\/\/nuxtseo\.com\/about<\/loc>[\s\S]*?<\/url>/g)
    expect(aboutUrlMatch).toBeDefined()

    const aboutUrl = aboutUrlMatch![0]
    // Verify it has the correct alternatives with custom paths
    expect(aboutUrl).toContain('<xhtml:link rel="alternate" hreflang="es-ES" href="https://nuxtseo.com/es/acerca-de" />')
    expect(aboutUrl).toContain('<xhtml:link rel="alternate" hreflang="fr-FR" href="https://nuxtseo.com/fr/a-propos" />')
    expect(aboutUrl).toContain('<xhtml:link rel="alternate" hreflang="x-default" href="https://nuxtseo.com/about" />')
  })
})
