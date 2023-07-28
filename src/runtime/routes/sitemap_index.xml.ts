import { defineEventHandler, getQuery, setHeader } from 'h3'
import { buildSitemapIndex } from '../sitemap/builder'
import type { ModuleRuntimeConfig, SitemapRenderCtx } from '../types'
import { setupCache } from '../util/cache'
import { createSitePathResolver, useRuntimeConfig } from '#imports'
import { getRouteRulesForPath } from '#internal/nitro/route-rules'

// @ts-expect-error untyped
import pages from '#nuxt-simple-sitemap/pages.mjs'

import { useNitroApp } from '#internal/nitro'

// @ts-expect-error untyped
import extraRoutes from '#nuxt-simple-sitemap/extra-routes.mjs'

export default defineEventHandler(async (e) => {
  const { moduleConfig, buildTimeMeta } = useRuntimeConfig()['nuxt-simple-sitemap'] as any as ModuleRuntimeConfig

  const { cachedSitemap, cache } = await setupCache(e, 'sitemap_index')
  let sitemap = cachedSitemap

  const nitro = useNitroApp()
  const callHook = async (ctx: SitemapRenderCtx) => {
    await nitro.hooks.callHook('sitemap:resolved', ctx)
  }

  if (!sitemap) {
    const canonicalQuery = getQuery(e).canonical
    const isShowingCanonical = typeof canonicalQuery !== 'undefined' && canonicalQuery !== 'false'
    sitemap = (await buildSitemapIndex({
      moduleConfig,
      buildTimeMeta,
      getRouteRulesForPath,
      callHook,
      extraRoutes,
      canonicalUrlResolver: createSitePathResolver(e, { canonical: isShowingCanonical || !process.dev, absolute: true, withBase: true }),
      relativeBaseUrlResolver: createSitePathResolver(e, { absolute: false, withBase: true }),
      pages,
    })).xml

    const nitro = useNitroApp()

    const ctx = { sitemap, sitemapName: 'sitemap' }
    await nitro.hooks.callHook('sitemap:output', ctx)
    sitemap = ctx.sitemap

    await cache(sitemap)
  }

  setHeader(e, 'Content-Type', 'text/xml; charset=UTF-8')
  if (!process.dev)
    setHeader(e, 'Cache-Control', 'max-age=600, must-revalidate')

  return sitemap
})
