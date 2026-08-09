import type {
  CollectSitemapResult,
  ParseSitemapOptions,
  SitemapDocument,
  SitemapInput,
  SitemapReference,
  SitemapUrlRecord,
} from './parse'

export type SitemapLoadSource = 'root' | 'redirect' | 'index_child' | 'robots'

export interface SitemapLoadRequest {
  url: string
  resource: 'sitemap' | 'robots'
  source: SitemapLoadSource
  depth: number
  parentUrl?: string
  signal?: AbortSignal
  maxWireBytes?: number
}

export type SitemapLoadFailureCode
  = | 'timeout'
    | 'cancelled'
    | 'wire_limit'
    | 'content_type'
    | 'network'

export type SitemapDocumentLoadResult
  = | { _tag: 'body', url: string, body: SitemapInput }
    | { _tag: 'redirect', url: string, location: string, status: number }
    | { _tag: 'not_found', url: string, status: 404 | 410 }
    | { _tag: 'http_error', url: string, status: number, statusText: string }
    | { _tag: 'load_error', url: string, code: SitemapLoadFailureCode, detail: string, bytesRead?: number }

export type SitemapDocumentLoader = (request: SitemapLoadRequest) => Promise<SitemapDocumentLoadResult>

export type SitemapTargetAuthorization
  = | { _tag: 'allow' }
    | { _tag: 'deny', reason: string }

export type SitemapTargetAuthorizer = (
  request: SitemapLoadRequest,
) => SitemapTargetAuthorization | Promise<SitemapTargetAuthorization>

export interface SitemapReaderOptions {
  loadDocument: SitemapDocumentLoader
  authorizeTarget: SitemapTargetAuthorizer
  limits?: {
    maxWireBytes?: number
    maxDecodedBytes?: number
    maxEntries?: number
    maxRedirects?: number
    maxDepth?: number
    maxDocuments?: number
    maxUrls?: number
  }
}

export interface SitemapReadOptions extends ParseSitemapOptions {
  maxWireBytes?: number
  maxRedirects?: number
  signal?: AbortSignal
  source?: SitemapLoadSource
  depth?: number
  parentUrl?: string
}

export type SitemapReadResult
  = | {
    _tag: 'ok'
    url: string
    document: SitemapDocument
    parse: Extract<CollectSitemapResult, { _tag: 'document' }>
  }
  | { _tag: 'not_found', url: string, status: 404 | 410 }
  | {
    _tag: 'failure'
    url: string
    reason: 'unauthorized' | 'redirect_limit' | 'invalid_redirect' | 'http' | 'load' | 'document'
    detail: string
    code?: SitemapLoadFailureCode
    status?: number
  }

export interface SitemapWalkOptions extends SitemapReadOptions {
  maxDepth?: number
  maxDocuments?: number
  maxUrls?: number
  concurrency?: number
  retention?: 'all' | 'none'
  /** Documents committed by an earlier bounded round. */
  seenDocuments?: readonly string[]
  onDocument?: SitemapWalkDocumentVisitor
}

export type SitemapWalkEntry
  = | {
    url: string
    depth: 0
    source: 'root'
    parentUrl?: never
  }
  | {
    url: string
    depth: number
    source: 'index_child'
    parentUrl: string
  }

export type SitemapWalkInput
  = | string
    | readonly string[]
    | readonly SitemapWalkEntry[]

export interface SitemapWalkDocument {
  requestedUrl: string
  resolvedUrl: string
  source: SitemapLoadSource
  depth: number
  parentUrl?: string
  document: SitemapDocument
  parse: Extract<CollectSitemapResult, { _tag: 'document' }>
}

export type SitemapWalkDocumentVisitor = (
  document: SitemapWalkDocument,
) => void | Promise<void>

export type SitemapWalkFailure = SitemapWalkEntry & {
  result: Exclude<SitemapReadResult, { _tag: 'ok' }>
}

export type SitemapWalkPartialReason
  = | 'read_failure'
    | 'depth_limit'
    | 'document_limit'
    | 'url_limit'
    | 'document_partial'
    | 'cancelled'

interface SitemapWalkBaseData {
  urlsObserved: number
  referencesObserved: number
  documentsAttempted: number
  documentsRead: number
  failures: SitemapWalkFailure[]
  /** Breadth-first work not committed before this bounded round stopped. */
  frontier: SitemapWalkEntry[]
}

type SitemapWalkStatus
  = | { _tag: 'complete' }
    | { _tag: 'partial', reasons: SitemapWalkPartialReason[] }

export type SitemapWalkRetainedResult = SitemapWalkStatus
  & SitemapWalkBaseData
  & {
    entriesRetained: true
    entries: SitemapUrlRecord[]
    references: SitemapReference[]
  }

export type SitemapWalkNonRetainedResult = SitemapWalkStatus
  & SitemapWalkBaseData
  & {
    entriesRetained: false
    entries: []
    references: []
  }

export type SitemapWalkResult
  = | SitemapWalkRetainedResult
    | SitemapWalkNonRetainedResult

export interface SitemapReader {
  read: (url: string, options?: SitemapReadOptions) => Promise<SitemapReadResult>
  walk: {
    (
      input: SitemapWalkInput,
      options: SitemapWalkOptions & { retention: 'none' },
    ): Promise<SitemapWalkNonRetainedResult>
    (
      input: SitemapWalkInput,
      options?: SitemapWalkOptions & { retention?: 'all' },
    ): Promise<SitemapWalkRetainedResult>
    (
      input: SitemapWalkInput,
      options?: SitemapWalkOptions,
    ): Promise<SitemapWalkResult>
  }
}
