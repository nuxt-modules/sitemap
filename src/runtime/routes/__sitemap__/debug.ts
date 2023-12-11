import { defineEventHandler } from 'h3'
import {
  childSitemapSources,
  globalSitemapSources,
  resolveSitemapSources,
} from '../../sitemap/urlset/sources'
import type { SitemapDefinition } from '../../types'
import { useSimpleSitemapRuntimeConfig } from '../../utils'
import { useNitroOrigin } from '#imports'

export default defineEventHandler(async (e) => {
  const _runtimeConfig = useSimpleSitemapRuntimeConfig()
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
  return {
    nitroOrigin,
    sitemaps,
    runtimeConfig,
    globalSources: await resolveSitemapSources(globalSources),
  }
})
