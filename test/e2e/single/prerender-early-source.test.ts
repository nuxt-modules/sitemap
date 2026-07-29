import { readFile } from 'node:fs/promises'
import { buildNuxt, createResolver, loadNuxt } from '@nuxt/kit'
import { describe, expect, it } from 'vitest'

describe('prerender source handoff', () => {
  it('makes configured URLs available before prerender:done', async () => {
    const { resolve } = createResolver(import.meta.url)
    const rootDir = resolve('../../fixtures/prerender-early-source')
    const nuxt = await loadNuxt({ rootDir })

    await buildNuxt(nuxt)

    const earlySitemap = await readFile(resolve(rootDir, '.output/public/early-sitemap/index.html'), 'utf8')
    expect(earlySitemap).toContain('<loc>https://example.com/configured</loc>')
  }, 120000)
})
