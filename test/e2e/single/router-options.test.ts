import { readFile } from 'node:fs/promises'
import { buildNuxt, createResolver, loadNuxt } from '@nuxt/kit'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

describe('prerender page exclusion follows router options', () => {
  it('excludes accepted case and slash variants of private static pages', async () => {
    const rootDir = resolve('../../fixtures/router-options')
    const nuxt = await loadNuxt({ rootDir, overrides: { _generate: true, nitro: { preset: 'static' } } })
    await buildNuxt(nuxt)
    const upperPage = await readFile(resolve(rootDir, '.output/public/HIDDEN/index.html'), 'utf8')
    expect(upperPage).toContain('Private page')
    const aliasPage = await readFile(resolve(rootDir, '.output/public/hidden-alias/index.html'), 'utf8')
    expect(aliasPage).toContain('Private page')
    const nestedAliasPage = await readFile(resolve(rootDir, '.output/public/nested/alias/index.html'), 'utf8')
    expect(nestedAliasPage).toContain('Private child page')
    const parentAliasPage = await readFile(resolve(rootDir, '.output/public/other/private/index.html'), 'utf8')
    expect(parentAliasPage).toContain('Private child page')
    const sitemap = await readFile(resolve(rootDir, '.output/public/sitemap.xml'), 'utf8')
    expect(sitemap).toContain('<loc>https://example.com/</loc>')
    expect(sitemap).not.toContain('https://example.com/hidden-alias')
    expect(sitemap).not.toContain('https://example.com/nested/alias')
    expect(sitemap).not.toContain('https://example.com/other/private')
    expect(sitemap).not.toContain('https://example.com/HIDDEN')
    expect(sitemap).not.toContain('https://example.com/hidden/')
  }, 1200000)
})
