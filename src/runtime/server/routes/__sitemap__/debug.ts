import { defineEventHandler } from 'h3'
import type { SitemapDefinition } from '../../../types'
import { useSitemapRuntimeConfig } from '../../utils'
import {
  resolveSitemapSources,
} from '../../sitemap/urlset/sources'
import { useNitroOrigin } from '#site-config/server/composables/useNitroOrigin'

export default defineEventHandler(async (e) => {
  const _runtimeConfig = useSitemapRuntimeConfig()
  const { sitemaps: _sitemaps } = _runtimeConfig
  const runtimeConfig = { ..._runtimeConfig }
  // @ts-expect-error hack
  delete runtimeConfig.sitemaps
  const globalSources = await import('#sitemap-virtual/global-sources.mjs')
    .then(m => m.sources)
  const nitroOrigin = useNitroOrigin(e)
  const sitemaps: Record<string, SitemapDefinition> = {}
  for (const s of Object.keys(_sitemaps)) {
    // resolve the sources
    sitemaps[s] = {
      ..._sitemaps[s],
      // sources: await resolveSitemapSources(await childSitemapSources(_sitemaps[s])),
    }
  }
  return {
    nitroOrigin,
    sitemaps,
    runtimeConfig,
    globalSources: await resolveSitemapSources(globalSources),
  }
})
