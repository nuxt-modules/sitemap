import { defineEventHandler, sendRedirect } from 'h3'
import { withBase } from 'ufo'
import { useSimpleSitemapRuntimeConfig } from '../utils'
import { createSitemap } from '../sitemap/nitro'
import { useRuntimeConfig } from '#imports'

export default defineEventHandler(async (e) => {
  const runtimeConfig = useSimpleSitemapRuntimeConfig()
  const { sitemaps } = runtimeConfig
  // we need to check if we're rendering multiple sitemaps from the index sitemap
  if ('index' in sitemaps) {
    // redirect to sitemap_index.xml (302 in dev to avoid caching issues)
    return sendRedirect(e, withBase('/sitemap_index.xml', useRuntimeConfig().app.baseURL), import.meta.dev ? 302 : 301)
  }

  return createSitemap(e, Object.values(sitemaps)[0], runtimeConfig)
})
