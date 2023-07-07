import { defineEventHandler, setHeader } from 'h3'
import { parseURL } from 'ufo'
import type { ModuleRuntimeConfig, SitemapRenderCtx } from '../types'
import { buildSitemap } from '../sitemap/builder'
import { setupCache } from '../util/cache'
import { createSitePathResolver, useNitroApp, useRuntimeConfig } from '#imports'
import { getRouteRulesForPath } from '#internal/nitro/route-rules'
import pages from '#nuxt-simple-sitemap/pages.mjs'

export default defineEventHandler(async (e) => {
  const path = parseURL(e.path).pathname
  if (!path.endsWith('-sitemap.xml'))
    return

  const { moduleConfig, buildTimeMeta } = useRuntimeConfig()['nuxt-simple-sitemap'] as any as ModuleRuntimeConfig
  if (!moduleConfig.sitemaps) {
    /// maybe the user is handling their own sitemap?
    return
  }

  const sitemapName = path.replace('-sitemap.xml', '').replace('/', '')
  if (moduleConfig.sitemaps !== true && !moduleConfig.sitemaps[sitemapName])
    return

  const { cachedSitemap, cache } = await setupCache(e, sitemapName)
  let sitemap = cachedSitemap

  if (!sitemap) {
    const nitro = useNitroApp()
    const callHook = async (ctx: SitemapRenderCtx) => {
      await nitro.hooks.callHook('sitemap:resolved', ctx)
    }
    // merge urls
    sitemap = await buildSitemap({
      sitemap: {
        name: sitemapName,
        ...moduleConfig.sitemaps[sitemapName],
      },
      nitroUrlResolver: createSitePathResolver(e, { canonical: false, absolute: true, withBase: true }),
      canonicalUrlResolver: createSitePathResolver(e, { canonical: !process.dev, absolute: true, withBase: true }),
      relativeBaseUrlResolver: createSitePathResolver(e, { absolute: false, withBase: true }),
      moduleConfig,
      buildTimeMeta,
      getRouteRulesForPath,
      callHook,
      pages,
    })

    const ctx = { sitemap, sitemapName }
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
