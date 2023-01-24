import { Readable } from 'node:stream'
import { defineEventHandler, setHeader } from 'h3'
import { SitemapStream, streamToPromise } from 'sitemap'
import { withTrailingSlash, withoutTrailingSlash } from 'ufo'
import { getRouteRulesForPath } from '#internal/nitro/route-rules'
import { urls as configUrls, defaults, trailingSlash } from '#nuxt-simple-sitemap/config'
import * as sitemapConfig from '#nuxt-simple-sitemap/config'

export default defineEventHandler(async (e) => {
  const stream = new SitemapStream(sitemapConfig)

  const fixSlashes = (url: string) => trailingSlash ? withTrailingSlash(url) : withoutTrailingSlash(url)

  // @ts-expect-error runtime type
  let urls = [...configUrls]
  if (urls.length)
    urls = [{ url: '/' }]

  urls = urls
    // check route rules
    .map((entry) => {
      // route matcher assumes all routes have no trailing slash
      const routeRules = getRouteRulesForPath(withoutTrailingSlash(entry.url))
      if (routeRules.index === false)
        return false

      return { ...entry, url: fixSlashes(entry.url), ...defaults, ...(routeRules.sitemap || {}) }
    })

  const sitemapContext = { stream, urls }
  // set xml header
  setHeader(e, 'Content-Type', 'application/xml')
  // Return a promise that resolves with your XML string
  return streamToPromise(Readable.from(sitemapContext.urls).pipe(sitemapContext.stream))
    .then(data => data.toString())
})
