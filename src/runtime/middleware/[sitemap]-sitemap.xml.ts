import { Readable } from 'node:stream'
import { defineEventHandler } from 'h3'
import { SitemapStream, streamToPromise } from 'sitemap'
import { parseURL } from 'ufo'
import { generateRoutes } from '../util/generateRoutes'
import { useHostname } from '../util/nuxt'
import * as sitemapConfig from '#nuxt-simple-sitemap/config'
import { useRuntimeConfig } from '#internal/nitro'
import { getRouteRulesForPath } from '#internal/nitro/route-rules'

export default defineEventHandler(async (e) => {
  const path = parseURL(e.path).pathname
  if (!path.endsWith('-sitemap.xml'))
    return

  const sitemapName = path.replace('-sitemap.xml', '').replace('/', '')
  const entryConfig = sitemapConfig.sitemaps[sitemapName]
  if (!entryConfig)
    return

  const urls = await generateRoutes({ ...sitemapConfig, ...entryConfig }, useRuntimeConfig().app.baseURL, getRouteRulesForPath)
  const stream = new SitemapStream({ ...sitemapConfig, xslUrl: `${useHostname(e)}_sitemap/style.xml` })
  const sitemapContext = { stream, urls }
  // Return a promise that resolves with your XML string
  return streamToPromise(Readable.from(sitemapContext.urls).pipe(sitemapContext.stream))
})
