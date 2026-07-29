import type { SitemapParseEvent } from '../../src/utils'
import { describe, expectTypeOf, it } from 'vitest'
import { parseSitemap } from '../../src/utils'

describe('stream parsing utilities', () => {
  it('accepts a fetch Response body', () => {
    const stream = parseSitemap(new Response().body!)
    expectTypeOf(stream).toMatchTypeOf<AsyncIterable<SitemapParseEvent>>()
  })
})
