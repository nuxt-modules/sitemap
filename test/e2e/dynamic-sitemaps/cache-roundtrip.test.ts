import { createResolver } from '@nuxt/kit'
import { fetch, setup } from '@nuxt/test-utils'
import { isCI } from 'std-env'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

// Production mode with caching: the merged runtime config (hook registrations, url functions,
// regex filters) round-trips through JSON cache storage. A urls function or RegExp filter that
// does not survive that round-trip renders empty sitemaps or 500s from the second request on.
await setup({
  rootDir: resolve('../../fixtures/dynamic-sitemaps'),
  dev: false,
  nuxtConfig: {
    sitemap: {
      cacheMaxAgeSeconds: 60,
      runtimeCacheStorage: {
        driver: 'memory',
      },
    },
  },
})

describe.skipIf(isCI)('runtime sitemap config cache round-trip', () => {
  it('serves hook-registered sitemaps with urls functions and regex filters after a cache hit', async () => {
    const first = await fetch('/__sitemap__/featured.xml')
    expect(first.status).toBe(200)
    const xml1 = await first.text()
    expect(xml1).toContain('<loc>https://nuxtseo.com/featured/a</loc>')
    expect(xml1).not.toContain('<loc>https://nuxtseo.com/featured/b</loc>')
    expect(xml1).not.toContain('<loc>https://nuxtseo.com/featured/c</loc>')

    // Second request within the cache window reads the round-tripped config
    const second = await fetch('/__sitemap__/featured.xml')
    expect(second.status).toBe(200)
    const xml2 = await second.text()
    expect(xml2).toContain('<loc>https://nuxtseo.com/featured/a</loc>')
    expect(xml2).not.toContain('<loc>https://nuxtseo.com/featured/b</loc>')
    expect(xml2).not.toContain('<loc>https://nuxtseo.com/featured/c</loc>')
  })

  it('serves the sitemap index with hook registrations after a cache hit', async () => {
    const first = await fetch('/sitemap_index.xml')
    expect(first.status).toBe(200)
    expect(await first.text()).toContain('<loc>https://nuxtseo.com/__sitemap__/games-0.xml</loc>')

    const second = await fetch('/sitemap_index.xml')
    expect(second.status).toBe(200)
    expect(await second.text()).toContain('<loc>https://nuxtseo.com/__sitemap__/games-0.xml</loc>')
  })

  it('serves source-backed registered sitemaps after a cache hit', async () => {
    const first = await fetch('/__sitemap__/games-0.xml')
    expect(first.status).toBe(200)
    expect(await first.text()).toContain('<loc>https://nuxtseo.com/game/1/game-1</loc>')

    const second = await fetch('/__sitemap__/games-0.xml')
    expect(second.status).toBe(200)
    expect(await second.text()).toContain('<loc>https://nuxtseo.com/game/1/game-1</loc>')
  })
})
