import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { buildNuxt, createResolver, loadNuxt } from '@nuxt/kit'
import { describe, expect, it } from 'vitest'

describe('issue #592: zeroRuntime should prerender sitemaps without manual nitro.prerender.routes', () => {
  it('generates sitemap index and child sitemaps with zeroRuntime and i18n', async () => {
    process.env.NODE_ENV = 'production'
    process.env.NUXT_PUBLIC_SITE_URL = 'https://nuxtseo.com'
    const { resolve } = createResolver(import.meta.url)
    const rootDir = resolve('../../fixtures/issue-592')
    const nuxt = await loadNuxt({
      rootDir,
      overrides: {
        // SSR build, not nuxt generate: _generate is false, preset is node-server
        _generate: false,
        nitro: {
          preset: 'node-server',
          prerender: {
            // no manual routes, zeroRuntime should handle it
            crawlLinks: false,
          },
        },
      },
    })

    await buildNuxt(nuxt)

    await new Promise(resolve => setTimeout(resolve, 1000))

    const outputDir = resolve(rootDir, '.output/public')

    // sitemap_index.xml should exist
    expect(existsSync(resolve(outputDir, 'sitemap_index.xml'))).toBe(true)
    const sitemapIndex = await readFile(resolve(outputDir, 'sitemap_index.xml'), 'utf-8')
    expect(sitemapIndex).toContain('__sitemap__/en-US.xml')
    expect(sitemapIndex).toContain('__sitemap__/de-DE.xml')

    // child sitemaps should exist
    expect(existsSync(resolve(outputDir, '__sitemap__/en-US.xml'))).toBe(true)
    expect(existsSync(resolve(outputDir, '__sitemap__/de-DE.xml'))).toBe(true)
  }, 120000)
})
