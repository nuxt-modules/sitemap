import type {
  FetchDocumentLoaderOptions,
  SitemapDocumentLoader,
  SitemapIndexStreamEvent,
  SitemapParseEvent,
  SitemapReader,
  SitemapStreamEvent,
  SitemapXmlStreamEvent,
} from '../../src/utils'
import { describe, expectTypeOf, it } from 'vitest'
import {
  collectSitemap,
  createFetchDocumentLoader,
  createSitemapReader,
  parseHtmlExtractSitemapMeta,
  parseSitemap,
  parseSitemapIndex,
  parseSitemapIndexStream,
  parseSitemapStream,
  parseSitemapXml,
  parseSitemapXmlStream,
} from '../../src/utils'

describe('stream parsing utilities', () => {
  it('accepts a fetch Response body', () => {
    const stream = parseSitemap(new Response().body!)
    expectTypeOf(stream).toMatchTypeOf<AsyncIterable<SitemapParseEvent>>()
  })

  it('preserves the existing utility exports', () => {
    expectTypeOf(collectSitemap).toBeFunction()
    expectTypeOf(parseSitemapIndex).toBeFunction()
    expectTypeOf(parseSitemapIndexStream('')).toMatchTypeOf<AsyncIterable<SitemapIndexStreamEvent>>()
    expectTypeOf(parseHtmlExtractSitemapMeta).toBeFunction()
    expectTypeOf(parseSitemap).toBeFunction()
    expectTypeOf(parseSitemapStream('')).toMatchTypeOf<AsyncIterable<SitemapStreamEvent>>()
    expectTypeOf(parseSitemapXml).toBeFunction()
    expectTypeOf(parseSitemapXmlStream('')).toMatchTypeOf<AsyncIterable<SitemapXmlStreamEvent>>()
  })

  it('re-exports the reader and Fetch adapter', () => {
    const reader = createSitemapReader({
      loadDocument: async request => ({
        _tag: 'not_found',
        url: request.url,
        status: 404,
      }),
      authorizeTarget: () => ({ _tag: 'allow' }),
    })
    const fetchOptions: FetchDocumentLoaderOptions = {
      fetch: async () => new Response(),
    }
    const loader = createFetchDocumentLoader(fetchOptions)

    expectTypeOf(reader).toMatchTypeOf<SitemapReader>()
    expectTypeOf(loader).toMatchTypeOf<SitemapDocumentLoader>()
  })
})
