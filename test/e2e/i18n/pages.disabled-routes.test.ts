import { describe, expect, it } from 'vitest'
import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../../fixtures/i18n'),
  build: true,
  server: true,
  nuxtConfig: {
    i18n: {
      baseUrl: 'https://i18n-locale-test.com',
      locales: [
        { code: 'en', iso: 'en-US', name: 'English' },
        { code: 'fr', iso: 'fr-FR', name: 'Français' },
      ],
      defaultLocale: 'en',
      strategy: 'no_prefix',
      pages: {
        '/about': {
          en: '/about',
          fr: false, // Disabled route
        },
        '/contact': {
          en: '/contact',
          fr: '/contact',
        },
      },
    },
  },
})

describe('i18n pages with disabled routes', () => {
  it('handles disabled routes properly with no_prefix strategy', async () => {
    const xml = await $fetch('/sitemap.xml')

    // Should not throw error and contain urlset
    expect(xml).toContain('<urlset')

    // Should only have URLs for enabled routes
    expect(xml).toContain('<loc>https://i18n-locale-test.com/about</loc>')
    expect(xml).toContain('<loc>https://i18n-locale-test.com/contact</loc>')

    // Disabled routes should not have alternatives pointing to them
    expect(xml).not.toContain('/fr/about')

    // Alternatives should only include enabled routes
    const urlPattern = /<url>(.*?)<\/url>/gs
    const urls = xml.match(urlPattern) || []

    // Find the about URL
    const aboutUrl = urls.find((url: string) => url.includes('/about</loc>'))
    if (aboutUrl) {
      // There should be only one alternate link for the English version
      const alternateLinks = aboutUrl.match(/<xhtml:link[^>]*\/>/g) || []
      expect(alternateLinks.length).toBeLessThanOrEqual(2) // at most en-US and x-default
      expect(aboutUrl).not.toContain('hreflang="fr-FR"') // French alternative should not exist
    }
  })
})
