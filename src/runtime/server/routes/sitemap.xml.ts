import { defineEventHandler, sendRedirect } from 'h3'
import { withBase } from 'ufo'
import { useRuntimeConfig } from 'nitropack/runtime'
import { useSitemapRuntimeConfig } from '../utils'
import { createSitemap } from '../sitemap/nitro'

export default defineEventHandler(async (e) => {
  const runtimeConfig = useSitemapRuntimeConfig()
  const { sitemaps } = runtimeConfig
  // we need to check if we're rendering multiple sitemaps from the index sitemap
  if ('index' in sitemaps) {
    // redirect to sitemap_index.xml (302 in dev to avoid caching issues)
    return sendRedirect(e, withBase('/sitemap_index.xml', useRuntimeConfig().app.baseURL), import.meta.dev ? 302 : 301)
  }

  const sitemap = Object.values(sitemaps)
  // if we had an index, we would have returned above. as we do not
  // this is compatible with SitemapDefinition expected
  const sm = sitemap[0] as typeof sitemaps['any_key_except_index']
  return createSitemap(e, sm, runtimeConfig)
})
