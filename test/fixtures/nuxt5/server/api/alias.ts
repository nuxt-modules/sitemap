import type { H3Event } from 'nitro/h3'
import { asSitemapUrl, defineSitemapEventHandler } from '#sitemap/server'
import { getSiteConfig } from '#site-config/server'

// A site utility typed against the Nitro 3 event, as a source handler may call.
function requestPath(event: H3Event) {
  return event.url.pathname
}

export default defineSitemapEventHandler((event) => {
  if (requestPath(event) !== '/api/alias')
    return []
  return [asSitemapUrl({ loc: `${getSiteConfig(event).url}/alias-proof` })]
})
