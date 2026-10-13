import { readFile } from 'node:fs/promises'
import { buildNuxt, createResolver, loadNuxt } from '@nuxt/kit'
import { describe, expect, it } from 'vitest'

// Nuxt 4.6 under compatibilityVersion 5 defines no `defineAppConfig` in the server bundle.
// The sitemap server code must not pull app.config.ts into it.
const { resolve } = createResolver(import.meta.url)
const rootDir = resolve('../../fixtures/compat5-app-config')

describe('compatibilityVersion 5 app config', () => {
  it('prerenders a sitemap when app.config.ts calls defineAppConfig', async () => {
    const nuxt = await loadNuxt({
      rootDir,
      overrides: { nitro: { prerender: { routes: ['/', '/sitemap.xml'] } } },
    })
    await buildNuxt(nuxt)

    const page = await readFile(resolve(rootDir, '.output/public/index.html'), 'utf8')
    expect(page).toContain('<div>emerald</div>')
    const sitemap = await readFile(resolve(rootDir, '.output/public/sitemap.xml'), 'utf8')
    expect(sitemap).toContain('<loc>https://example.com/</loc>')
  }, 180000)

  it('prerenders multiple sitemaps when app.config.ts calls defineAppConfig', async () => {
    const nuxt = await loadNuxt({
      rootDir,
      overrides: {
        nitro: { prerender: { routes: ['/', '/sitemap_index.xml'] } },
        sitemap: { sitemaps: { pages: { includeAppSources: true } } },
      },
    })
    await buildNuxt(nuxt)

    const pages = await readFile(resolve(rootDir, '.output/public/__sitemap__/pages.xml'), 'utf8')
    expect(pages).toContain('<loc>https://example.com/</loc>')
  }, 180000)
})
