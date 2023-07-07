import { defineEventHandler, setHeader } from 'h3'
import { buildSitemapIndex } from '../sitemap/builder'
import type { ModuleRuntimeConfig, SitemapRenderCtx } from '../types'
import { setupCache } from '../util/cache'
import { createSitePathResolver, useRuntimeConfig } from '#imports'
import { getRouteRulesForPath } from '#internal/nitro/route-rules'
import pages from '#nuxt-simple-sitemap/pages.mjs'
import { useNitroApp } from '#internal/nitro'

export default defineEventHandler(async (e) => {
  const { moduleConfig, buildTimeMeta } = useRuntimeConfig()['nuxt-simple-sitemap'] as any as ModuleRuntimeConfig

  const { cachedSitemap, cache } = await setupCache(e, 'sitemap_index')
  let sitemap = cachedSitemap

  const nitro = useNitroApp()
  const callHook = async (ctx: SitemapRenderCtx) => {
    await nitro.hooks.callHook('sitemap:resolved', ctx)
  }

  if (!sitemap) {
    sitemap = (await buildSitemapIndex({
      moduleConfig,
      buildTimeMeta,
      getRouteRulesForPath,
      callHook,
      nitroUrlResolver: createSitePathResolver(e, { canonical: false, absolute: true, withBase: true }),
      canonicalUrlResolver: createSitePathResolver(e, { canonical: !process.dev, absolute: true, withBase: true }),
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
