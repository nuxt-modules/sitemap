import type { RequestEvent } from 'nuxt/server'
import { asSitemapUrl, defineSitemapEventHandler } from '#sitemap/server'
import { getSiteConfig } from '#site-config/server'

// A site utility uses Nuxt's portable request event.
function requestPath(event: RequestEvent) {
  return event.url.pathname
}

export default defineSitemapEventHandler((event) => {
  if (requestPath(event) !== '/api/alias')
    return []
  return [asSitemapUrl({ loc: `${getSiteConfig(event).url}/alias-proof` })]
})
