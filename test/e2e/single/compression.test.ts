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
    const xml = await response.text()
    expect(xml).toContain('<urlset')
    expect(xml).not.toContain('<?xml-stylesheet')
  })

  it('omits the built-in stylesheet with xsl disabled', async () => {
    const response = await fetch('/__sitemap__/style.xsl')
    expect(response.status).toBe(404)
  })
})
