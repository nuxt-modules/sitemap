import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../../fixtures/dynamic-sitemaps'),
  server: true,
  nuxtConfig: {
    hooks: {
      'nitro:config': function (config) {
        config.runtimeConfig ??= {}
        config.runtimeConfig.public ??= {}
        config.runtimeConfig.public.siteUrl = 'https://nuxtseo.com'
      },
    },
  },
})

describe('sitemap:sitemaps-resolved hook', () => {
  it('lists runtime-registered sitemaps in the index', async () => {
    const index = await $fetch('/sitemap_index.xml')

    expect(index).toContain('<sitemapindex')
    expect(index).toContain('<loc>https://nuxtseo.com/__sitemap__/pages.xml</loc>')
    // 12 games / 5 per chunk = 3 chunks
    expect(index).toContain('<loc>https://nuxtseo.com/__sitemap__/games-0.xml</loc>')
    expect(index).toContain('<loc>https://nuxtseo.com/__sitemap__/games-1.xml</loc>')
    expect(index).toContain('<loc>https://nuxtseo.com/__sitemap__/games-2.xml</loc>')
    expect(index).not.toContain('<loc>https://nuxtseo.com/__sitemap__/games-3.xml</loc>')
    // static sitemap still listed while the delete condition (games < 10) is false
    expect(index).toContain('<loc>https://nuxtseo.com/__sitemap__/legacy.xml</loc>')
  })

  it('serves a runtime-registered child sitemap from its own source', async () => {
    const chunk = await $fetch('/__sitemap__/games-0.xml')

    expect(chunk).toContain('<urlset')
    expect(chunk).toContain('<loc>https://nuxtseo.com/game/1/game-1</loc>')
    expect(chunk).toContain('<loc>https://nuxtseo.com/game/5/game-5</loc>')
    expect(chunk).not.toContain('<loc>https://nuxtseo.com/game/6/game-6</loc>')
  })

  it('sets a reliable per-chunk lastmod via the index-resolved hook', async () => {
    const index = await $fetch('/sitemap_index.xml')

    // chunk 0 holds games 1-5, chunk 1 holds games 6-10, chunk 2 holds games 11-12
    expect(index).toContain('<lastmod>2024-01-05T00:00:00.000Z</lastmod>')
    expect(index).toContain('<lastmod>2024-01-10T00:00:00.000Z</lastmod>')
    expect(index).toContain('<lastmod>2024-01-12T00:00:00.000Z</lastmod>')
  })

  it('registers new chunks when the data grows while the server is running', async () => {
    // 12 games exist; push past 20 so a 4th and 5th chunk appear
    await $fetch('/api/__test__/add-games', { method: 'POST', body: { count: 10 } })

    const index = await $fetch('/sitemap_index.xml')
    expect(index).toContain('<loc>https://nuxtseo.com/__sitemap__/games-3.xml</loc>')
    expect(index).toContain('<loc>https://nuxtseo.com/__sitemap__/games-4.xml</loc>')

    const chunk = await $fetch('/__sitemap__/games-4.xml')
    expect(chunk).toContain('<urlset')
    expect(chunk).toContain('<loc>https://nuxtseo.com/game/22/game-22</loc>')
  })

  it('stops serving chunks that no longer have data', async () => {
    // 22 games exist; drop to 4 so only chunk 0 remains
    await $fetch('/api/__test__/remove-games', { method: 'POST', body: { count: 18 } })

    const index = await $fetch('/sitemap_index.xml')
    expect(index).toContain('<loc>https://nuxtseo.com/__sitemap__/games-0.xml</loc>')
    expect(index).not.toContain('<loc>https://nuxtseo.com/__sitemap__/games-1.xml</loc>')
    expect(index).not.toContain('<loc>https://nuxtseo.com/__sitemap__/games-4.xml</loc>')

    const chunk = await $fetch('/__sitemap__/games-0.xml')
    expect(chunk).toContain('<loc>https://nuxtseo.com/game/4/game-4</loc>')
    expect(chunk).not.toContain('<loc>https://nuxtseo.com/game/5/game-5</loc>')

    const status = await $fetch('/__sitemap__/games-1.xml').then(() => 200).catch((e: any) => e.status ?? e.statusCode)
    expect(status).toBe(404)
  })

  it('removes static sitemaps deleted from ctx.sitemaps', async () => {
    // the delete condition (games < 10) now holds after the removal above
    const index = await $fetch('/sitemap_index.xml')
    expect(index).not.toContain('<loc>https://nuxtseo.com/__sitemap__/legacy.xml</loc>')

    const status = await $fetch('/__sitemap__/legacy.xml').then(() => 200).catch((e: any) => e.status ?? e.statusCode)
    expect(status).toBe(404)
  })

  it('supports urls and filter fields on runtime definitions', async () => {
    const index = await $fetch('/sitemap_index.xml')
    expect(index).toContain('<loc>https://nuxtseo.com/__sitemap__/featured.xml</loc>')

    const chunk = await $fetch('/__sitemap__/featured.xml')
    expect(chunk).toContain('<loc>https://nuxtseo.com/featured/a</loc>')
    expect(chunk).toContain('<loc>https://nuxtseo.com/featured/c</loc>')
    // excluded by the definition's exclude filter
    expect(chunk).not.toContain('<loc>https://nuxtseo.com/featured/b</loc>')
  })

  it('shows runtime-registered sitemaps in the debug endpoint', async () => {
    const debug = await $fetch('/__sitemap__/debug.json')
    expect(Object.keys(debug.sitemaps)).toContain('games-0')
  })
})
