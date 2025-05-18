import { describe, it, expect } from 'vitest'
import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../../fixtures/content-v3'),
  nuxtConfig: {
    sitemap: {
      xsl: false,
    },
    site: {
      url: 'https://nuxtseo.com',
    },
  },
})

describe('content-v3 YAML/JSON', () => {
  it('basic', async () => {
    const sitemapContents = await $fetch('/sitemap.xml', { responseType: 'text' })

    // Check that YAML content with sitemap metadata is included
    expect(sitemapContents).toMatch('https://nuxtseo.com/test-yaml')

    // Check YAML sitemap metadata is extracted
    const yamlMatch = sitemapContents.match(/<url>.*?<loc>https:\/\/nuxtseo\.com\/test-yaml<\/loc>.*?<\/url>/s)
    expect(yamlMatch).toBeTruthy()
    if (yamlMatch) {
      expect(yamlMatch[0]).toMatch('<lastmod>2025-05-13')
      expect(yamlMatch[0]).toMatch('<changefreq>monthly</changefreq>')
      expect(yamlMatch[0]).toMatch('<priority>0.8</priority>')
    }

    // Check that JSON content with sitemap metadata is included
    expect(sitemapContents).toMatch('https://nuxtseo.com/test-json')

    // Check JSON sitemap metadata is extracted
    const jsonMatch = sitemapContents.match(/<url>.*?<loc>https:\/\/nuxtseo\.com\/test-json<\/loc>.*?<\/url>/s)
    expect(jsonMatch).toBeTruthy()
    if (jsonMatch) {
      expect(jsonMatch[0]).toMatch('<lastmod>2025-05-14')
      expect(jsonMatch[0]).toMatch('<changefreq>weekly</changefreq>')
      expect(jsonMatch[0]).toMatch('<priority>0.9</priority>')
    }
  })
})
