import { access, readFile } from 'node:fs/promises'
import { buildNuxt, createResolver, loadNuxt } from '@nuxt/kit'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)
// The fixture's home page links to /sitemap.xml, so the prerender crawler reaches it.
const rootDir = resolve('../../fixtures/multi-sitemap-index-root')

describe('multi sitemap /sitemap.xml', () => {
  it('leaves /sitemap.xml to the runtime redirect on a server build', async () => {
    const nuxt = await loadNuxt({ rootDir })
    await buildNuxt(nuxt)

    await expect(access(resolve(rootDir, '.output/public/sitemap.xml'))).rejects.toThrow()
  }, 180000)

  it('serves the sitemap index at /sitemap.xml on a static build', async () => {
    const nuxt = await loadNuxt({
      rootDir,
      overrides: {
        _generate: true,
        nitro: { preset: 'static' },
      },
    })
    await buildNuxt(nuxt)

    const sitemap = await readFile(resolve(rootDir, '.output/public/sitemap.xml'), 'utf8')
    expect(sitemap).toContain('<sitemapindex')
    expect(sitemap).toContain('<loc>https://example.com/__sitemap__/posts.xml</loc>')
  }, 180000)
})
