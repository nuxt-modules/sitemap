import { defineEventHandler } from 'h3'
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
  const sitemaps: Record<string, typeof _sitemaps[number] & { sources: Awaited<ReturnType<typeof resolveSitemapSources>> }> = {}
  for (const s of Object.keys(_sitemaps)) {
    if (!_sitemaps[s]) {
      throw new Error('Could not resolve matching key in _sitemaps')
    }
    // resolve the sources
    sitemaps[s] = {
      ..._sitemaps[s],
      sources: await resolveSitemapSources(await childSitemapSources(_sitemaps[s]), e),
    }
  }
  return {
    nitroOrigin,
    sitemaps,
    runtimeConfig,
    globalSources: await resolveSitemapSources(globalSources, e),
    siteConfig: { ...siteConfig },
  }
})
