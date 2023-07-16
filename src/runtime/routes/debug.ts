import { defineEventHandler, getQuery } from 'h3'
import { resolveAsyncDataSources } from '../sitemap/entries'
import type { ModuleRuntimeConfig, SitemapRoot } from '../types'
import { createSitePathResolver, useRuntimeConfig } from '#imports'
import pages from '#nuxt-simple-sitemap/pages.mjs'
import { getRouteRulesForPath } from '#internal/nitro/route-rules'

export default defineEventHandler(async (e) => {
  const { moduleConfig, buildTimeMeta } = useRuntimeConfig()['nuxt-simple-sitemap'] as any as ModuleRuntimeConfig

  let sitemap: SitemapRoot | undefined
  // accept query of the sitemap name
  const sitemapName = getQuery(e).sitemap as string
  if (sitemapName) {
    // use the config sitemap
    if (typeof moduleConfig.sitemaps === 'object' && moduleConfig.sitemaps[sitemapName])
      sitemap = { sitemapName, ...moduleConfig.sitemaps[sitemapName] } as SitemapRoot
  }

  const config = { ...moduleConfig }
  delete config.urls
  const sources = (await resolveAsyncDataSources({
    moduleConfig,
    sitemap,
    buildTimeMeta,
    getRouteRulesForPath,
    nitroUrlResolver: createSitePathResolver(e, { canonical: false, absolute: true, withBase: true }),
    canonicalUrlResolver: createSitePathResolver(e, { canonical: !process.dev, absolute: true, withBase: true }),
    relativeBaseUrlResolver: createSitePathResolver(e, { absolute: false, withBase: true }),
    pages,
  })).map((d) => {
    // add the count of urls
    d.count = d.urls.length
    return d
  })
  return {
    _sources: [...sources]
      .filter((s) => {
        return s.urls.length > 0 || s.error
      })
      .map((s) => {
        s = { ...s }
        s.urls = s.urls.length || 0
        return s
      }),
    moduleConfig: config,
    buildTimeMeta,
    sources,
  }
})
