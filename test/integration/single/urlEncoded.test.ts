import { describe, expect, it } from 'vitest'
import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../../fixtures/basic'),
  nuxtConfig: {
    sitemap: {
      urls: [
        '/Bücher',
        '/Bibliothèque',
      ],
    },
  },
})
describe('query routes', () => {
  it('should be url encoded', async () => {
    const sitemap = await $fetch('/sitemap.xml')

    expect(sitemap).toContain('<loc>https://nuxtseo.com/B%C3%BCcher</loc>')
    expect(sitemap).toContain('<loc>https://nuxtseo.com/Biblioth%C3%A8que</loc>')
    expect(sitemap).not.toContain('https://nuxtseo.com/Bücher')
    expect(sitemap).not.toContain('https://nuxtseo.com/Bibliothèque')
  }, 60000)
})
