import { defineEventHandler } from 'h3'
import type { SitemapDefinition } from '../../../types'
import { useSitemapRuntimeConfig } from '../../utils'
import {
  childSitemapSources,
  globalSitemapSources,
  resolveSitemapSources,
} from '../../sitemap/urlset/sources'
import { getNitroOrigin, getSiteConfig } from '#site-config/server/composables'

export default defineEventHandler(async (e) => {
  const _runtimeConfig = useSitemapRuntimeConfig()
  const siteConfig = getSiteConfig(e)
  const { sitemaps: _sitemaps } = _runtimeConfig
  const runtimeConfig = { ..._runtimeConfig }
  // @ts-expect-error hack
  delete runtimeConfig.sitemaps
  const globalSources = await globalSitemapSources()
  const nitroOrigin = getNitroOrigin(e)
  const sitemaps: Record<string, SitemapDefinition> = {}
  for (const s of Object.keys(_sitemaps)) {
    const sitemap = _sitemaps[s]!
    // resolve the sources
    sitemaps[s] = {
      ...sitemap,
      sources: await resolveSitemapSources(await childSitemapSources(sitemap), e),
    } as SitemapDefinition
  }
  return {
    nitroOrigin,
    sitemaps,
    runtimeConfig,
    globalSources: await resolveSitemapSources(globalSources, e),
    siteConfig: { ...siteConfig },
  }
})
