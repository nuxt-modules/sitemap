import { prefixStorage } from 'unstorage'
import type { H3Event } from 'h3'
import { getQuery, setHeader } from 'h3'
import type { ModuleRuntimeConfig } from '../types'
import { useRuntimeConfig, useStorage } from '#imports'

export async function setupCache(e: H3Event, key: string) {
  const { moduleConfig, buildTimeMeta } = useRuntimeConfig()['nuxt-simple-sitemap'] as any as ModuleRuntimeConfig

  const useCache = !process.dev && !process.env.prerender && moduleConfig.runtimeCacheStorage && moduleConfig.cacheTtl && moduleConfig.cacheTtl > 0
  const baseCacheKey = moduleConfig.runtimeCacheStorage === 'default' ? `/cache/nuxt-simple-sitemap${buildTimeMeta.version}` : `/nuxt-simple-sitemap/${buildTimeMeta.version}`
  const cache = prefixStorage(useStorage(), `${baseCacheKey}/sitemaps`)
  let xSitemapCacheHeader = 'MISS'
  let xSitemapCacheExpires = 0
  const purge = typeof getQuery(e).purge !== 'undefined'
  // cache will invalidate if the options change
  let cachedSitemap: string | false = false
  if (useCache && await cache.hasItem(key)) {
    const { value, expiresAt } = await cache.getItem(key) as any
    if (expiresAt > Date.now()) {
      if (purge) {
        xSitemapCacheHeader = 'PURGE'
        await cache.removeItem(key)
      }
      else {
        xSitemapCacheHeader = 'HIT'
        xSitemapCacheExpires = expiresAt
        cachedSitemap = value as string
      }
    }
    else {
      await cache.removeItem(key)
    }
  }
  // append the headers
  setHeader(e, 'x-sitemap-cache', xSitemapCacheHeader)
  setHeader(e, 'x-sitemap-cache-expires', xSitemapCacheExpires.toString())

  return {
    cachedSitemap,
    cache: async (sitemap: string) => {
      if (useCache)
        await cache.setItem(key, { value: sitemap, expiresAt: Date.now() + (moduleConfig.cacheTtl || 0) })
    },
  }
}
