import type { SitemapStreamEvent } from '../../src/utils'
import { describe, expectTypeOf, it } from 'vitest'
import { parseSitemapStream } from '../../src/utils'

describe('stream parsing utilities', () => {
  it('accepts a fetch Response body', () => {
    const stream = parseSitemapStream(new Response().body!)
    expectTypeOf(stream).toMatchTypeOf<AsyncIterable<SitemapStreamEvent>>()
  })
})
