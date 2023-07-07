import { defineEventHandler, setHeader } from 'h3'
import { prefixStorage } from 'unstorage'
import { buildSitemapIndex } from '../sitemap/builder'
import type { ModuleRuntimeConfig, SitemapRenderCtx } from '../types'
import { createSitePathResolver, useRuntimeConfig, useStorage } from '#imports'
import { getRouteRulesForPath } from '#internal/nitro/route-rules'
import pages from '#nuxt-simple-sitemap/pages.mjs'
import { useNitroApp } from '#internal/nitro'

export default defineEventHandler(async (e) => {
  const { moduleConfig, buildTimeMeta, version } = useRuntimeConfig()['nuxt-simple-sitemap'] as any as ModuleRuntimeConfig

  const useCache = moduleConfig.runtimeCacheStorage && !process.dev && moduleConfig.cacheTtl && moduleConfig.cacheTtl > 0
  const baseCacheKey = moduleConfig.runtimeCacheStorage === 'default' ? `/cache/nuxt-simple-sitemap${version}` : `/nuxt-simple-sitemap/${version}`
  const cache = prefixStorage(useStorage(), `${baseCacheKey}`)
  // cache will invalidate if the options change
  const key = 'sitemap_index'
  let sitemap: string
  if (useCache && await cache.hasItem(key)) {
    const { value, expiresAt } = await cache.getItem(key) as any
    if (expiresAt > Date.now())
      sitemap = value as string
    else
      await cache.removeItem(key)
  }

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

    if (useCache)
      await cache.setItem(key, { value: sitemap, expiresAt: Date.now() + (moduleConfig.cacheTtl || 0) })
  }

  setHeader(e, 'Content-Type', 'text/xml; charset=UTF-8')
  if (!process.dev)
    setHeader(e, 'Cache-Control', 'max-age=600, must-revalidate')

  return sitemap
})
