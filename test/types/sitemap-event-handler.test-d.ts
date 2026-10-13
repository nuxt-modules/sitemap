import type { H3Event, getQuery as h3GetQuery } from 'h3'
import type { RequestEvent } from 'nuxt/server'
import { describe, expectTypeOf, it } from 'vitest'
import { defineSitemapEventHandler } from '../../src/runtime/server/composables/defineSitemapEventHandler'

// h3 helpers and site utilities written against the server builder's own event.
declare const getQuery: typeof h3GetQuery
declare function getDatabase(event: H3Event): { urls: () => string[] }

describe('defineSitemapEventHandler', () => {
  it('passes the event to helpers typed against the h3 event', () => {
    defineSitemapEventHandler((event) => {
      expectTypeOf(event).toMatchTypeOf<H3Event>()
      const page = getQuery(event).page
      return getDatabase(event).urls().map(loc => ({ loc: `${loc}?page=${String(page)}` }))
    })
  })

  it('keeps the portable request event', () => {
    defineSitemapEventHandler((event) => {
      expectTypeOf(event).toMatchTypeOf<RequestEvent>()
      return [{ loc: event.req.headers.get('host') || '/' }]
    })
  })

  it('accepts a handler typed with RequestEvent', () => {
    const handler = (_event: RequestEvent) => [{ loc: '/' }]
    defineSitemapEventHandler(handler)
  })
})
