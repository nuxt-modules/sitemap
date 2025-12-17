import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { buildNuxt, createResolver, loadNuxt } from '@nuxt/kit'

describe('generate prefix_except_default', () => {
  it('root path should have all alternatives when prerendered', async () => {
    process.env.NODE_ENV = 'production'
    // @ts-expect-error untyped
    process.env.prerender = true
    process.env.NITRO_PRESET = 'static'
    process.env.NUXT_PUBLIC_SITE_URL = 'https://nuxtseo.com'
    const { resolve } = createResolver(import.meta.url)
    const rootDir = resolve('../../fixtures/i18n-generate')
    const nuxt = await loadNuxt({
      rootDir,
      overrides: {
        _generate: true,
        nitro: {
          preset: 'static',
        },
      },
    })

    await buildNuxt(nuxt)

    await new Promise(resolve => setTimeout(resolve, 1000))

    // Multi-sitemap mode creates per-locale sitemaps
    const sitemap = (await readFile(resolve(rootDir, '.output/public/__sitemap__/en-US.xml'), 'utf-8'))
      .replace(/lastmod>(.*?)</g, 'lastmod><')

    // Check root path has all alternatives
    // With prefix_except_default: / is en (default), /de is de
    expect(sitemap).toContain('<loc>https://nuxtseo.com/</loc>')

    // Root path should have en-US alternate pointing to /
    expect(sitemap).toContain('hreflang="en-US"')
    expect(sitemap).toContain('href="https://nuxtseo.com/"')

    // Root path should have de-DE alternate
    expect(sitemap).toContain('hreflang="de-DE"')
    expect(sitemap).toContain('href="https://nuxtseo.com/de"')

    // Root path should have x-default alternate pointing to /
    expect(sitemap).toContain('hreflang="x-default"')
  }, 120000)
})
