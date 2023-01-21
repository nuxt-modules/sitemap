import { Readable } from 'node:stream'
import { defineEventHandler, setHeader } from 'h3'
import { SitemapStream, streamToPromise } from 'sitemap'
import { withTrailingSlash, withoutTrailingSlash } from 'ufo'
import { getRouteRulesForPath } from '#internal/nitro/route-rules'
import * as configExport from '#nuxt-simple-sitemap/config'

export default defineEventHandler(async (e) => {
  const config = { ...configExport }
  const stream = new SitemapStream(config)

  const fixSlashes = (url: string) => configExport.trailingSlash ? withTrailingSlash(url) : withoutTrailingSlash(url)

  const urls = config.urls
    // check route rules
    .map((entry) => {
      // route matcher assumes all routes have no trailing slash
      const routeRules = getRouteRulesForPath(withoutTrailingSlash(entry.url))
      if (routeRules.index === false)
        return false

      return { ...entry, url: fixSlashes(entry.url), ...config.defaults, ...(routeRules.sitemap || {}) }
    })
    .filter(Boolean)

  const sitemapContext = { stream, urls }
  // set xml header
  setHeader(e, 'Content-Type', 'application/xml')
  // Return a promise that resolves with your XML string
  return streamToPromise(Readable.from(sitemapContext.urls).pipe(sitemapContext.stream))
    .then(data => data.toString())
})
