import { defineEventHandler } from 'h3'
import { resolveAsyncSitemapData } from '../sitemap/entries'
import type { ModuleRuntimeConfig } from '../types'
import { createSitePathResolver, useRuntimeConfig } from '#imports'
import pages from '#nuxt-simple-sitemap/pages.mjs'
import { getRouteRulesForPath } from '#internal/nitro/route-rules'

export default defineEventHandler(async (e) => {
  const { moduleConfig, buildTimeMeta } = useRuntimeConfig()['nuxt-simple-sitemap'] as any as ModuleRuntimeConfig

  const config = { ...moduleConfig }
  delete config.urls
  return {
    moduleConfig: config,
    buildTimeMeta,
    data: (await resolveAsyncSitemapData({
      moduleConfig,
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
    }),
  }
})
