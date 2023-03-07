import { Readable } from 'node:stream'
import { defineEventHandler, setHeader } from 'h3'
import { SitemapStream, streamToPromise } from 'sitemap'
import { parseURL, withoutBase, withoutTrailingSlash } from 'ufo'
import { getRouteRulesForPath } from '#internal/nitro/route-rules'
import { urls as configUrls, defaults } from '#nuxt-simple-sitemap/config'
import * as sitemapConfig from '#nuxt-simple-sitemap/config'
import { useRuntimeConfig } from '#internal/nitro'

export default defineEventHandler(async (e) => {
  // need to clone the config object to make it writable
  const stream = new SitemapStream({ ...sitemapConfig })

  const runtimeConfig = useRuntimeConfig()

  // @ts-expect-error runtime type
  let urls = [...configUrls]
  if (!urls.length)
    urls = [{ url: '/' }]

  urls = urls
    // check route rules
    .map((entry) => {
      // route matcher assumes all routes have no trailing slash
      const routeRules = getRouteRulesForPath(withoutBase(withoutTrailingSlash(parseURL(entry.url).pathname), runtimeConfig.app.baseURL))
      if (routeRules.index === false)
        return false

      return { ...entry, ...defaults, ...(routeRules.sitemap || {}) }
    })
    .filter(Boolean)

  const sitemapContext = { stream, urls }
  // set xml header
  setHeader(e, 'Content-Type', 'application/xml')
  // Return a promise that resolves with your XML string
  return streamToPromise(Readable.from(sitemapContext.urls).pipe(sitemapContext.stream))
    .then(data => data.toString())
})
