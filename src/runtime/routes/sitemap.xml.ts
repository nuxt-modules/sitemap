import { defineEventHandler, sendRedirect, setHeader } from 'h3'
import { withBase } from 'ufo'
import { prefixStorage } from 'unstorage'
import type { ModuleRuntimeConfig, SitemapRenderCtx } from '../types'
import { buildSitemap } from '../sitemap/builder'
import { createSitePathResolver, useRuntimeConfig, useStorage } from '#imports'
import { useNitroApp } from '#internal/nitro'
import { getRouteRulesForPath } from '#internal/nitro/route-rules'
import pages from '#nuxt-simple-sitemap/pages.mjs'

export default defineEventHandler(async (e) => {
  const { moduleConfig, buildTimeMeta, version } = useRuntimeConfig()['nuxt-simple-sitemap'] as any as ModuleRuntimeConfig
  // we need to check if we're rendering multiple sitemaps from the index sitemap
  if (moduleConfig.sitemaps) {
    // redirect to sitemap_index.xml (302 in dev to avoid caching issues)
    return sendRedirect(e, withBase('/sitemap_index.xml', useRuntimeConfig().app.baseURL), process.dev ? 302 : 301)
  }

  const useCache = moduleConfig.runtimeCacheStorage && !process.dev && moduleConfig.cacheTtl && moduleConfig.cacheTtl > 0
  const baseCacheKey = moduleConfig.runtimeCacheStorage === 'default' ? `/cache/nuxt-simple-sitemap${version}` : `/nuxt-simple-sitemap/${version}`
  const cache = prefixStorage(useStorage(), `${baseCacheKey}/sitemaps`)
  // cache will invalidate if the options change
  const key = 'sitemap'
  let sitemap: string
  if (useCache && await cache.hasItem(key)) {
    const { value, expiresAt } = await cache.getItem(key) as any
    if (expiresAt > Date.now())
      sitemap = value as string
    else
      await cache.removeItem(key)
  }

  if (!sitemap) {
    const nitro = useNitroApp()
    const callHook = async (ctx: SitemapRenderCtx) => {
      await nitro.hooks.callHook('sitemap:resolved', ctx)
    }

    sitemap = await buildSitemap({
      moduleConfig,
      buildTimeMeta,
      nitroUrlResolver: createSitePathResolver(e, { canonical: false, absolute: true, withBase: true }),
      canonicalUrlResolver: createSitePathResolver(e, { canonical: !process.dev, absolute: true, withBase: true }),
      relativeBaseUrlResolver: createSitePathResolver(e, { absolute: false, withBase: true }),
      getRouteRulesForPath,
      callHook,
      pages,
    })

    const ctx = { sitemap, sitemapName: 'sitemap' }
    await nitro.hooks.callHook('sitemap:output', ctx)
    sitemap = ctx.sitemap

    if (useCache)
      await cache.setItem(key, { value: sitemap, expiresAt: Date.now() + (moduleConfig.cacheTtl || 0) })
  }
  // need to clone the config object to make it writable
  setHeader(e, 'Content-Type', 'text/xml; charset=UTF-8')
  if (!process.dev)
    setHeader(e, 'Cache-Control', 'max-age=600, must-revalidate')

  return sitemap
})
