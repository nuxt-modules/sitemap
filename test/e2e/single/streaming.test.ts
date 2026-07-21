import type { IncomingMessage } from 'node:http'
import fs from 'node:fs'
import { request } from 'node:http'
import path from 'node:path'
import { createResolver } from '@nuxt/kit'
import { fetch, setup, useTestContext } from '@nuxt/test-utils'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

const { resolve } = createResolver(import.meta.url)
const cacheDir = resolve('../../fixtures/streaming/.data/sitemap-cache-test')

beforeAll(() => {
  fs.rmSync(cacheDir, { force: true, recursive: true })
})

afterAll(() => {
  fs.rmSync(cacheDir, { force: true, recursive: true })
})

await setup({
  rootDir: resolve('../../fixtures/streaming'),
  dev: false,
  nuxtConfig: {
    sitemap: {
      runtimeCacheStorage: {
        driver: 'fs',
        base: cacheDir,
      },
    },
  },
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

  it('persists the finalized URL plan instead of serialized XML', async () => {
    await fetch('/__sitemap__/pages.xml', {
      headers: { 'Accept-Encoding': 'identity' },
    })

    await vi.waitFor(() => {
      const cacheFiles = fs.readdirSync(cacheDir, { recursive: true })
        .map(file => path.join(cacheDir, file))
        .filter(file => fs.statSync(file).isFile())
      expect(cacheFiles.length).toBeGreaterThan(0)

      const cachedValues = cacheFiles.map(file => fs.readFileSync(file, 'utf8')).join('\n')
      expect(cachedValues).toContain('page-1999')
      expect(cachedValues).not.toContain('<urlset')
    })
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

  it('stops pulling and cancels when a slow Node client disconnects', async () => {
    const baseUrl = useTestContext().url
    expect(baseUrl).toBeTruthy()

    const response = await new Promise<IncomingMessage>((resolve, reject) => {
      const clientRequest = request(new URL('/api/slow-stream', baseUrl), {
        headers: { 'Accept-Encoding': 'identity' },
      }, resolve)
      clientRequest.once('error', reject)
      clientRequest.end()
    })

    try {
      await new Promise<void>((resolve, reject) => {
        response.once('data', () => {
          response.pause()
          resolve()
        })
        response.once('error', reject)
      })

      await vi.waitFor(async () => {
        const state = await fetch('/api/stream-state').then(value => value.json()) as { pulls: number }
        expect(state.pulls).toBeGreaterThan(0)
        expect(state.pulls).toBeLessThan(16)
      })

      response.destroy()
      await vi.waitFor(async () => {
        const state = await fetch('/api/stream-state').then(value => value.json()) as { cancelled: boolean }
        expect(state.cancelled).toBe(true)
      })
    }
    finally {
      response.destroy()
    }
  })
})
