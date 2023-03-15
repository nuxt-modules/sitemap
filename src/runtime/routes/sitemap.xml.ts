import { Readable } from 'node:stream'
import { defineEventHandler, setHeader, sendRedirect } from 'h3'
import {SitemapStream, streamToPromise } from 'sitemap'
import { generateRoutes } from '../util/generateRoutes'
import * as sitemapConfig from '#nuxt-simple-sitemap/config'
import { useRuntimeConfig } from '#internal/nitro'
import { getRouteRulesForPath } from '#internal/nitro/route-rules'
import {useHostname} from "../util/nuxt";

export default defineEventHandler(async (e) => {

  // if (process.dev) {
  //   const url = joinURL(baseURL(), '/sitemap.preview.xml')
  //   return `Notice: Previewing the sitemap in development won't show you dynamic routes discovered through the crawler. <br><br>You can preview it at <a href="${url}">/sitemap.preview.xml</a><br><br>If you\'d like to view the real sitemap run <code>nuxi generate</code> or <code>nuxi build</code>.`
  // }
  // need to clone the config object to make it writable
  setHeader(e, 'Content-Type', 'text/xml; charset=UTF-8')
  setHeader(e, 'Cache-Control', 'max-age=600, must-revalidate')

  let urls = []
  // we need to check if we're rendering multiple sitemaps from the index sitemap
  if (sitemapConfig.sitemaps) {
    // redirect to sitemap_index.xml
    return sendRedirect(e, '/sitemap_index.xml', 301)
  }

  const stream = new SitemapStream({ ...sitemapConfig, xslUrl: `${useHostname(e)}_sitemap/style.xml` })
  // generate all the routes
  urls = await generateRoutes(sitemapConfig, useRuntimeConfig().app.baseURL, getRouteRulesForPath)

  const sitemapContext = { stream, urls }
  // Return a promise that resolves with your XML string
  return streamToPromise(Readable.from(sitemapContext.urls).pipe(sitemapContext.stream))
    .then(data => data.toString())
})
