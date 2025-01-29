import { defineEventHandler } from 'h3'
import { useStorage } from 'nitropack/runtime'
import type { SitemapDefinition } from '../../../types'
import { useSitemapRuntimeConfig } from '../../utils'
import {
  childSitemapSources,
  globalSitemapSources,
  resolveSitemapSources,
} from '../../sitemap/urlset/sources'
import { useNitroOrigin } from '#imports'

export default defineEventHandler(async (e) => {
  const _runtimeConfig = useSitemapRuntimeConfig()
  const { sitemaps: _sitemaps } = _runtimeConfig
  const runtimeConfig = { ..._runtimeConfig }
  // @ts-expect-error hack
  delete runtimeConfig.sitemaps
  const globalSources = await globalSitemapSources()
  const nitroOrigin = useNitroOrigin(e)
  const sitemaps: Record<string, SitemapDefinition> = {}
  for (const s of Object.keys(_sitemaps)) {
    // resolve the sources
    sitemaps[s] = {
      ..._sitemaps[s],
      sources: await resolveSitemapSources(await childSitemapSources(_sitemaps[s])),
    }
  }
  const cacheKeys = await useStorage().keys('cache:sitemap')
  const cacheFiles = await Promise.all(cacheKeys.map(async k => ({ key: k, val: await useStorage().get(k) })))
  return {
    cache: cacheFiles,
    nitroOrigin,
    sitemaps,
    runtimeConfig,
    globalSources: await resolveSitemapSources(globalSources),
  }
})
