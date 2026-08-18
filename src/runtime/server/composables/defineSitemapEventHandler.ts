import type { EventHandler, EventHandlerRequest, EventHandlerResponse } from '#nuxtseo/h3'
import type { SitemapUrlInput } from '../../types'
import { defineEventHandler } from '#nuxtseo/h3'
import { defineCachedEventHandler } from '#nuxtseo/nitro'

export type SitemapEventHandler = EventHandler<EventHandlerRequest, EventHandlerResponse<SitemapUrlInput[]>>

/**
 * Cache options for a sitemap source endpoint, matching Nitro's `defineCachedEventHandler`.
 */
export type SitemapEventHandlerCacheOptions = NonNullable<Parameters<typeof defineCachedEventHandler>[1]>

/**
 * Define a sitemap source endpoint that returns an array of sitemap URLs.
 *
 * Resolved sitemaps are already cached for `cacheMaxAgeSeconds`, so this handler is not called on
 * every crawler request. Pass `cache` when the upstream data is slow, rate limited, or metered.
 */
export function defineSitemapEventHandler(handler: SitemapEventHandler, cache?: SitemapEventHandlerCacheOptions): SitemapEventHandler {
  // `defineCachedEventHandler` widens the response to `unknown`; the handler signature keeps the real shape.
  return cache ? defineCachedEventHandler(handler, cache) as SitemapEventHandler : defineEventHandler(handler)
}
