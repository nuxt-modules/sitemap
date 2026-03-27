import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../../fixtures/issue-561'),
  server: true,
  dev: false,
})

describe('issue #561 - autoI18n: false generates empty sitemap', () => {
  it('should generate a single sitemap.xml (not redirect to sitemap_index)', async () => {
    const sitemap = await $fetch('/sitemap.xml')

    // should be a sitemap, not a redirect to sitemap_index
    expect(sitemap).toContain('<urlset')
    expect(sitemap).not.toContain('sitemap_index')
  }, 60000)

  it('should contain all locale routes without hreflang alternates', async () => {
    let sitemap = await $fetch('/sitemap.xml')

    // strip lastmod for cleaner assertions
    sitemap = sitemap.replace(/<lastmod>.*<\/lastmod>/g, '')

    // should contain URL entries - not empty
    expect(sitemap).toContain('<url>')
    expect(sitemap).toContain('<loc>')

    // should contain the homepage and locale variants
    expect(sitemap).toContain('https://example.com/')
    expect(sitemap).toContain('/en')

    // should contain custom i18n page routes
    expect(sitemap).toContain('/envoyer-tableau')
    expect(sitemap).toContain('/en/submit-art')
    expect(sitemap).toContain('/politique-de-confidentialite')
    expect(sitemap).toContain('/en/privacy-policy')

    // autoI18n: false should suppress hreflang alternatives (#586)
    expect(sitemap).not.toContain('xhtml:link')
    expect(sitemap).not.toContain('hreflang')
  }, 60000)
})
