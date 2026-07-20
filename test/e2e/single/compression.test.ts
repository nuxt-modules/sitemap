import { createResolver } from '@nuxt/kit'
import { fetch, setup } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../../fixtures/basic'),
  server: true,
  nuxtConfig: {
    sitemap: {
      experimentalCompression: true,
      xsl: false,
    },
  },
})

describe('streaming sitemap compression', () => {
  it('serves a readable gzip response', async () => {
    const response = await fetch('/sitemap.xml', {
      headers: {
        'accept-encoding': 'gzip',
      },
    })

    expect(response.headers.get('content-encoding')).toBe('gzip')
    expect(await response.text()).toContain('<urlset')
  })
})
