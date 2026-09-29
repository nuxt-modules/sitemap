import { access, readdir } from 'node:fs/promises'
import { buildNuxt, createResolver, loadNuxt } from '@nuxt/kit'
import { describe, expect, it } from 'vitest'

describe('zeroPrerender', () => {
  it('prerenders pages without a build-time site URL and skips the sitemap', async () => {
    const { resolve } = createResolver(import.meta.url)
    const rootDir = resolve('../../fixtures/zero-prerender')
    const nuxt = await loadNuxt({ rootDir })

    // prerendering the sitemap without a site URL must not fail the build (#675)
    await buildNuxt(nuxt)

    const output = resolve(rootDir, '.output/public')
    // the crawled pages are prerendered
    await access(resolve(output, 'index.html'))
    await access(resolve(output, 'about/index.html'))
    // the sitemap is left to runtime
    await expect(readdir(output)).resolves.not.toContain('sitemap.xml')
  }, 600000)

  it('filters a user-listed sitemap route out of prerendering without crawlLinks', async () => {
    const { resolve } = createResolver(import.meta.url)
    const rootDir = resolve('../../fixtures/zero-prerender-routes')
    const nuxt = await loadNuxt({ rootDir })

    // the explicit `/sitemap.xml` prerender route must not fail the build (#677)
    await buildNuxt(nuxt)

    const output = resolve(rootDir, '.output/public')
    // the listed page is prerendered
    await access(resolve(output, 'index.html'))
    // the sitemap is left to runtime
    await expect(readdir(output)).resolves.not.toContain('sitemap.xml')
  }, 600000)
})
