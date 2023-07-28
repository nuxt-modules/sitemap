import { defineEventHandler, getQuery, sendRedirect, setHeader } from 'h3'
import { withBase } from 'ufo'
import type { ModuleRuntimeConfig, SitemapRenderCtx } from '../types'
import { buildSitemap } from '../sitemap/builder'
import { setupCache } from '../util/cache'
import { createSitePathResolver, useRuntimeConfig } from '#imports'
import { useNitroApp } from '#internal/nitro'
import { getRouteRulesForPath } from '#internal/nitro/route-rules'

// @ts-expect-error untyped
import pages from '#nuxt-simple-sitemap/pages.mjs'

export default defineEventHandler(async (e) => {
  const { moduleConfig, buildTimeMeta } = useRuntimeConfig()['nuxt-simple-sitemap'] as any as ModuleRuntimeConfig
  // we need to check if we're rendering multiple sitemaps from the index sitemap
  if (moduleConfig.sitemaps) {
    // redirect to sitemap_index.xml (302 in dev to avoid caching issues)
    return sendRedirect(e, withBase('/sitemap_index.xml', useRuntimeConfig().app.baseURL), process.dev ? 302 : 301)
  }

  const { cachedSitemap, cache } = await setupCache(e, 'sitemap', getQuery(e).purge)
  let sitemap = cachedSitemap
  if (!cachedSitemap) {
    const nitro = useNitroApp()
    const callHook = async (ctx: SitemapRenderCtx) => {
      await nitro.hooks.callHook('sitemap:resolved', ctx)
    }

    const canonicalQuery = getQuery(e).canonical
    const isShowingCanonical = typeof canonicalQuery !== 'undefined' && canonicalQuery !== 'false'

    sitemap = await buildSitemap({
      moduleConfig,
      buildTimeMeta,
      canonicalUrlResolver: createSitePathResolver(e, { canonical: isShowingCanonical || !process.dev, absolute: true, withBase: true }),
      relativeBaseUrlResolver: createSitePathResolver(e, { absolute: false, withBase: true }),
      getRouteRulesForPath,
      callHook,
      pages,
    })

    const ctx = { sitemap, sitemapName: 'sitemap' }
    await nitro.hooks.callHook('sitemap:output', ctx)
    sitemap = ctx.sitemap

    await cache(sitemap)
  }
  // need to clone the config object to make it writable
  setHeader(e, 'Content-Type', 'text/xml; charset=UTF-8')
  if (!process.dev)
    setHeader(e, 'Cache-Control', 'max-age=600, must-revalidate')

  return sitemap
})
