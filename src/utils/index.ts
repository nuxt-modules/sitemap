export type * from '../runtime/types'
export type {
  SitemapIndexEntry,
  SitemapIndexParseResult,
  SitemapIndexStreamEvent,
  SitemapKind,
  SitemapParseResult,
  SitemapStreamEvent,
  SitemapStreamOptions,
  SitemapWarning,
  SitemapXmlChunk,
  SitemapXmlInput,
  SitemapXmlStreamEvent,
} from './legacySitemap'
export {
  isSitemapIndex,
  parseSitemapIndex,
  parseSitemapIndexStream,
  parseSitemapStream,
  parseSitemapXml,
  parseSitemapXmlStream,
} from './legacySitemap.ts'
export { parseHtmlExtractSitemapMeta } from './parseHtmlExtractSitemapMeta.ts'
export { createSitemapReader } from 'sitemapd'
export type {
  SitemapDocumentLoader,
  SitemapDocumentLoadResult,
  SitemapLoadFailureCode,
  SitemapLoadRequest,
  SitemapLoadSource,
  SitemapReader,
  SitemapReaderOptions,
  SitemapReadOptions,
  SitemapReadResult,
  SitemapTargetAuthorization,
  SitemapTargetAuthorizer,
  SitemapWalkDocument,
  SitemapWalkDocumentVisitor,
  SitemapWalkFailure,
  SitemapWalkNonRetainedResult,
  SitemapWalkOptions,
  SitemapWalkPartialReason,
  SitemapWalkResult,
  SitemapWalkRetainedResult,
} from 'sitemapd'
export { createFetchDocumentLoader } from 'sitemapd/fetch'
export type {
  FetchDocumentLoaderOptions,
  SitemapFetch,
} from 'sitemapd/fetch'
export { collectSitemap, parseSitemap } from 'sitemapd/parse'
export type {
  CollectSitemapResult,
  ParseSitemapOptions,
  SitemapCompleteness,
  SitemapDocument,
  SitemapDocumentKind,
  SitemapExtensions,
  SitemapFormat,
  SitemapInput,
  SitemapIssue,
  SitemapIssueCode,
  SitemapParseEvent,
  SitemapReference,
  SitemapUrlRecord,
} from 'sitemapd/parse'
