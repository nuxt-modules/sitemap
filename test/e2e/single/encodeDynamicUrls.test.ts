import { describe, expect, it } from 'vitest'
import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../../fixtures/basic'),
  nuxtConfig: {
    sitemap: {
      urls: [
        // Pre-encoded URL with reserved characters - marked as encoded
        {
          loc: `/${encodeURIComponent('$-:)')}`,
          _encoded: true,
        },
        // Pre-encoded emoji - marked as encoded
        {
          loc: `/${encodeURIComponent('😅')}`,
          _encoded: true,
        },
        // Regular path without _encoded - will be auto-encoded
        '/Bücher',
      ],
    },
  },
})

describe('_encoded: true', () => {
  it('should preserve pre-encoded URLs without double-encoding', async () => {
    const sitemap = await $fetch('/sitemap.xml')

    // Pre-encoded reserved characters should stay encoded ($ and : stay encoded, ) is safe so gets decoded)
    expect(sitemap).toContain('<loc>https://nuxtseo.com/%24-%3A)</loc>')

    // Pre-encoded emoji should stay encoded
    expect(sitemap).toContain('<loc>https://nuxtseo.com/%F0%9F%98%85</loc>')

    // Regular URL should be auto-encoded
    expect(sitemap).toContain('<loc>https://nuxtseo.com/B%C3%BCcher</loc>')
  }, 60000)
})
