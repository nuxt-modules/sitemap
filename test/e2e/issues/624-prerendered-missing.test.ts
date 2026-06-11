import { readFile } from 'node:fs/promises'
import { buildNuxt, createResolver, loadNuxt } from '@nuxt/kit'
import { describe, expect, it } from 'vitest'

// https://github.com/nuxt-modules/sitemap/issues/624
// A prerendered, indexable page whose `_sitemap` was never set ends up in
// `allPrerenderedPaths` (removed from the page source) but is filtered out of
// `prerenderUrlsFinal`, so it disappears from the sitemap entirely.
describe.skipIf(process.env.CI)('issue-624', () => {
  it('prerendered page without _sitemap is dropped from the sitemap', async () => {
    process.env.NODE_ENV = 'production'
    // @ts-expect-error untyped
    process.env.prerender = true
    process.env.NITRO_PRESET = 'static'
    process.env.NUXT_PUBLIC_SITE_URL = 'https://nuxtseo.com'
    const { resolve } = createResolver(import.meta.url)
    const rootDir = resolve('../../fixtures/issue-624')
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

    console.log('\n===SITEMAP===\n', sitemap, '\n===END===\n')

    // control: still has _sitemap, present in the sitemap
    expect(sitemap).toContain('<loc>https://nuxtseo.com/prerendered/a</loc>')
    // bug: _sitemap stripped, page is silently dropped (issue #624)
    expect(sitemap).toContain('<loc>https://nuxtseo.com/prerendered/b</loc>')
    // regression guard: a prerendered redirect (its `_sitemap` is also undefined)
    // must NOT be resurfaced by the missing-`_sitemap` fallback
    expect(sitemap).not.toContain('<loc>https://nuxtseo.com/old</loc>')
  }, 1200000)
})
