import type { EventHandler, NuxtRequestEvent, RequestEvent } from 'nuxt/server'
import type { SitemapUrlInput } from '../../types'
import { defineEventHandler } from 'nuxt/server'

/**
 * The event a sitemap source handler receives.
 *
 * It is the portable `RequestEvent`, and also the server builder's own event: the h3 v1
 * `H3Event` under Nitro 2, and the `nitro/h3` `H3Event` under Nitro 3. Both runtimes pass an
 * object that serves both shapes, so the event also works with h3 helpers and site utilities
 * typed against `H3Event`.
 */
export type SitemapEventHandlerEvent = NuxtRequestEvent & RequestEvent

type SitemapEventHandlerResult = SitemapUrlInput[] | Promise<SitemapUrlInput[]>

export function defineSitemapEventHandler(handler: (event: SitemapEventHandlerEvent) => SitemapEventHandlerResult): EventHandler<SitemapEventHandlerResult> {
  // `nuxt/server` types the event as `RequestEvent` only. At runtime it is the builder's event too.
  return defineEventHandler(handler as EventHandler<SitemapEventHandlerResult>)
}
