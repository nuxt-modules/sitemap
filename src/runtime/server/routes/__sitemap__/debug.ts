import { defineEventHandler } from 'h3'
import type { SitemapDefinition, SitemapSourceResolved } from '../../../types'
import { useSitemapRuntimeConfig } from '../../utils'
import {
  childSitemapSources,
  globalSitemapSources,
  resolveSitemapSources,
} from '../../sitemap/urlset/sources'
import { validateSitemapUrl } from '../../sitemap/urlset/normalise'
import { getNitroOrigin, getSiteConfig } from '#site-config/server/composables'

function attachUrlWarnings(sources: SitemapSourceResolved[]) {
  for (const source of sources) {
    if (!source.urls?.length)
      continue
    const warnings: SitemapSourceResolved['_urlWarnings'] = []
    for (const url of source.urls) {
      const msgs = validateSitemapUrl(url)
      if (msgs.length) {
        const loc = typeof url === 'string' ? url : (url.loc || '')
        for (const message of msgs)
          warnings.push({ loc, message })
      }
    }
    if (warnings.length)
      source._urlWarnings = warnings
  }
  return sources
}

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
      sources: attachUrlWarnings(await resolveSitemapSources(await childSitemapSources(sitemap), e)),
    } as SitemapDefinition
  }
  return {
    nitroOrigin,
    sitemaps,
    runtimeConfig,
    globalSources: attachUrlWarnings(await resolveSitemapSources(globalSources, e)),
    siteConfig: { ...siteConfig },
  }
})
