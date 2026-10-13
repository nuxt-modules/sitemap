import { readFile } from 'node:fs/promises'
import { buildNuxt, createResolver, loadNuxt } from '@nuxt/kit'
import { describe, expect, it } from 'vitest'

describe('compatibilityVersion 5 app config', () => {
  it('prerenders when app.config.ts calls defineAppConfig', async () => {
    const { resolve } = createResolver(import.meta.url)
    const rootDir = resolve('../../fixtures/compat5-app-config')
    const nuxt = await loadNuxt({ rootDir })

    await buildNuxt(nuxt)

    const page = await readFile(resolve(rootDir, '.output/public/index.html'), 'utf8')
    expect(page).toContain('<div>emerald</div>')
    const theme = JSON.parse(await readFile(resolve(rootDir, '.output/public/theme.json'), 'utf8'))
    expect(theme).toEqual({ primary: 'emerald' })
    const sitemap = await readFile(resolve(rootDir, '.output/public/sitemap.xml'), 'utf8')
    expect(sitemap).toContain('<loc>https://example.com/</loc>')
  }, 180000)
})
