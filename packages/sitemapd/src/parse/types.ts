export type SitemapChunk = string | Uint8Array

export type SitemapInput
  = | SitemapChunk
    | Iterable<SitemapChunk>
    | AsyncIterable<SitemapChunk>
    | ReadableStream<SitemapChunk>

export type SitemapFormat = 'xml' | 'rss2' | 'atom1' | 'text'
export type SitemapDocumentKind = 'urlset' | 'index'

export interface SitemapAlternative {
  rel?: string
  hreflang?: string
  href: string
}

export interface SitemapImage {
  loc: string
  caption?: string
  geoLocation?: string
  title?: string
  license?: string
}

export interface SitemapMediaContent {
  url: string
  type?: string
  medium?: string
}

export interface SitemapMediaThumbnail {
  url: string
  width?: string
  height?: string
}

export interface SitemapExtensions {
  alternatives?: SitemapAlternative[]
  images?: SitemapImage[]
  videos?: Record<string, unknown>[]
  news?: Record<string, unknown>
  media?: {
    contents?: SitemapMediaContent[]
    thumbnails?: SitemapMediaThumbnail[]
  }
}

export interface SitemapUrlRecord {
  loc: string
  lastmod?: string
  changefreq?: string
  priority?: string
  extensions?: SitemapExtensions
}

export interface SitemapReference {
  loc: string
  lastmod?: string
}

export interface SitemapUrlsetDocument {
  _tag: 'urlset'
  format: Exclude<SitemapFormat, never>
  entries: SitemapUrlRecord[]
}

export interface SitemapIndexDocument {
  _tag: 'index'
  format: 'xml'
  entries: SitemapReference[]
}

export type SitemapDocument = SitemapUrlsetDocument | SitemapIndexDocument

export type SitemapIssueCode
  = | 'decoded_limit'
    | 'entry_limit'
    | 'empty'
    | 'html'
    | 'invalid_utf8'
    | 'malformed'
    | 'unsupported'
    | 'missing_loc'
    | 'invalid_loc'

export interface SitemapIssue {
  code: SitemapIssueCode
  severity: 'warning' | 'error'
  message: string
  entryIndex?: number
  field?: string
  value?: unknown
}

export type SitemapCompleteness
  = | { _tag: 'complete' }
    | { _tag: 'partial', reason: 'decoded_limit' | 'entry_limit' }
    | { _tag: 'failed', reason: 'empty' | 'html' | 'unsupported' | 'invalid_utf8' | 'malformed' }

export interface SitemapParseSummary {
  bytesRead: number
  entriesRead: number
  compressed: boolean
}

export type SitemapParseEvent
  = | { _tag: 'document', format: SitemapFormat, kind: SitemapDocumentKind }
    | { _tag: 'url', entry: SitemapUrlRecord }
    | { _tag: 'sitemap', entry: SitemapReference }
    | { _tag: 'issue', issue: SitemapIssue }
    | { _tag: 'end', completeness: SitemapCompleteness, summary: SitemapParseSummary }

export interface ParseSitemapOptions {
  formatHint?: 'text'
  maxDecodedBytes?: number
  maxEntries?: number
  maxEntryBytes?: number
}

export type CollectSitemapResult
  = | {
    _tag: 'document'
    document: SitemapDocument
    issues: SitemapIssue[]
    completeness: Extract<SitemapCompleteness, { _tag: 'complete' | 'partial' }>
    summary: SitemapParseSummary
  }
  | {
    _tag: 'partial'
    issues: SitemapIssue[]
    completeness: Extract<SitemapCompleteness, { _tag: 'partial' }>
    summary: SitemapParseSummary
  }
  | {
    _tag: 'failure'
    issues: SitemapIssue[]
    completeness: Extract<SitemapCompleteness, { _tag: 'failed' }>
    summary: SitemapParseSummary
  }
