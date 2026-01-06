import { describe, expect, it } from 'vitest'
import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'

const { resolve } = createResolver(import.meta.url)

// Use dedicated fixture with custom path config including dynamic routes
await setup({
  rootDir: resolve('../../fixtures/i18n-custom-paths'),
  server: true,
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

  // Issue #542: dynamic route with parameters should apply custom path transformation
  it('should apply custom paths to dynamic routes with single parameter', async () => {
    const enSitemap = await $fetch('/__sitemap__/en-US.xml')
    const esSitemap = await $fetch('/__sitemap__/es-ES.xml')
    const frSitemap = await $fetch('/__sitemap__/fr-FR.xml')

    // Test that /posts/my-slug with _i18nTransform generates custom paths with parameter substitution
    expect(enSitemap).toContain('<loc>https://nuxtseo.com/posts/my-slug</loc>')
    expect(esSitemap).toContain('<loc>https://nuxtseo.com/es/articulos/my-slug</loc>')
    expect(frSitemap).toContain('<loc>https://nuxtseo.com/fr/article/my-slug</loc>')
  })

  it('should generate correct alternatives for dynamic routes with parameter', async () => {
    const enSitemap = await $fetch('/__sitemap__/en-US.xml')

    // Check the posts URL entry - should have parameter substitution in alternatives
    const postsUrlMatch = enSitemap.match(/<url>[\s\S]*?<loc>https:\/\/nuxtseo\.com\/posts\/my-slug<\/loc>[\s\S]*?<\/url>/g)
    expect(postsUrlMatch).toBeDefined()

    const postsUrl = postsUrlMatch![0]
    expect(postsUrl).toContain('<xhtml:link rel="alternate" hreflang="es-ES" href="https://nuxtseo.com/es/articulos/my-slug" />')
    expect(postsUrl).toContain('<xhtml:link rel="alternate" hreflang="fr-FR" href="https://nuxtseo.com/fr/article/my-slug" />')
    expect(postsUrl).toContain('<xhtml:link rel="alternate" hreflang="x-default" href="https://nuxtseo.com/posts/my-slug" />')
  })

  it('should apply custom paths to dynamic routes with multiple parameters', async () => {
    const enSitemap = await $fetch('/__sitemap__/en-US.xml')
    const esSitemap = await $fetch('/__sitemap__/es-ES.xml')
    const frSitemap = await $fetch('/__sitemap__/fr-FR.xml')

    // Test that /products/electronics/laptop-123 generates custom paths with both parameters
    expect(enSitemap).toContain('<loc>https://nuxtseo.com/products/electronics/laptop-123</loc>')
    expect(esSitemap).toContain('<loc>https://nuxtseo.com/es/productos/electronics/laptop-123</loc>')
    expect(frSitemap).toContain('<loc>https://nuxtseo.com/fr/produits/electronics/laptop-123</loc>')
  })
})
