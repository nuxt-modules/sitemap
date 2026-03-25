import { readFile } from 'node:fs/promises'
import { buildNuxt, createResolver, loadNuxt } from '@nuxt/kit'
import { describe, expect, it } from 'vitest'

describe.skipIf(process.env.CI)('generate', () => {
  it('basic', async () => {
    process.env.NODE_ENV = 'production'
    // @ts-expect-error untyped
    process.env.prerender = true
    process.env.NITRO_PRESET = 'static'
    process.env.NUXT_PUBLIC_SITE_URL = 'https://nuxtseo.com'
    const { resolve } = createResolver(import.meta.url)
    const rootDir = resolve('../../fixtures/generate')
    const nuxt = await loadNuxt({
      rootDir,
      overrides: {
        nitro: {
          preset: 'static',
        },
        _generate: true,
      },
    })
    await buildNuxt(nuxt)

    await new Promise(resolve => setTimeout(resolve, 1000))

    const sitemap = (await readFile(resolve(rootDir, '.output/public/sitemap.xml'), 'utf-8')).replace(/lastmod>(.*?)</g, 'lastmod><')
    // verify /noindex is not in the sitemap
    expect(sitemap).not.toContain('/noindex')

    // #568: verify definePageMeta sitemap data is preserved during generate
    expect(sitemap).toContain('<loc>https://nuxtseo.com/about</loc>')
    expect(sitemap).toContain('<changefreq>daily</changefreq>')
    expect(sitemap).toContain('<priority>0.8</priority>')

    // #568: verify route rules sitemap data is applied during generate
    expect(sitemap).toContain('<loc>https://nuxtseo.com/sub/page</loc>')
    expect(sitemap).toContain('<changefreq>weekly</changefreq>')
    expect(sitemap).toContain('<priority>0.5</priority>')
  }, 1200000)
})
