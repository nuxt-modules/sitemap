import { createResolver } from '@nuxt/kit'
import { fetch, setup } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../../fixtures/streaming'),
  dev: false,
})

describe('experimental sitemap streaming', () => {
  it('streams sitemap indexes and URL sets', async () => {
    const indexResponse = await fetch('/sitemap_index.xml', {
      headers: { 'Accept-Encoding': 'identity' },
    })
    expect(indexResponse.status).toBe(200)
    expect(indexResponse.headers.get('X-Sitemap-Render-Mode')).toBe('stream')
    expect(indexResponse.headers.get('Content-Length')).toBeNull()
    expect(indexResponse.headers.get('Vary')).toContain('Accept-Encoding')
    expect(await indexResponse.text()).toContain('/__sitemap__/pages.xml')

    const sitemapResponse = await fetch('/__sitemap__/pages.xml', {
      headers: { 'Accept-Encoding': 'identity' },
    })
    expect(sitemapResponse.status).toBe(200)
    expect(sitemapResponse.headers.get('X-Sitemap-Render-Mode')).toBe('stream')
    expect(sitemapResponse.headers.get('X-Test-Sitemap-Resolved')).toBe('1')
    expect(sitemapResponse.headers.get('Content-Length')).toBeNull()
    const sitemap = await sitemapResponse.text()
    expect(sitemap).toContain('<urlset')
    expect(sitemap).toContain('https://streaming.example.com/page-1999')
    expect(sitemap.endsWith('</urlset>')).toBe(true)
  })

  it('compresses without buffering the stream', async () => {
    const response = await fetch('/__sitemap__/pages.xml', {
      headers: { 'Accept-Encoding': 'deflate;q=0.5, gzip;q=1' },
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Encoding')).toBe('gzip')
    expect(response.headers.get('Content-Length')).toBeNull()
    expect(response.headers.get('X-Sitemap-Render-Mode')).toBe('stream')
    // The finalized URL plan is cached even though XML and gzip stay streamed.
    expect(response.headers.get('X-Test-Sitemap-Resolved')).toBeNull()
    expect(await response.text()).toContain('https://streaming.example.com/page-1999')
  })

  it('buffers only when an output hook accesses the XML string', async () => {
    const response = await fetch('/__sitemap__/posts.xml', {
      headers: {
        'Accept-Encoding': 'identity',
        'X-Test-Buffer-Output': 'true',
      },
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('X-Sitemap-Render-Mode')).toBe('buffered-hook')
    expect(await response.text()).toContain('<!-- output-hook -->')
  })

  it('matches child sitemap routes independently of the query string', async () => {
    const response = await fetch('/__sitemap__/posts.xml?canonical=true', {
      headers: { 'Accept-Encoding': 'identity' },
    })

    expect(response.status).toBe(200)
    expect(await response.text()).toContain('https://streaming.example.com/post')
  })

  it('keeps socketless local fetch responses as Web streams', async () => {
    const response = await fetch('/api/local-sitemap')

    expect(response.status).toBe(200)
    expect(await response.text()).toContain('https://streaming.example.com/post')
  })
})
