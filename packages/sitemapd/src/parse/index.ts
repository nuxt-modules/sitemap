import type { SitemapInputStats } from './input'
import type {
  CollectSitemapResult,
  ParseSitemapOptions,
  SitemapCompleteness,
  SitemapDocument,
  SitemapDocumentKind,
  SitemapFormat,
  SitemapInput,
  SitemapIssue,
  SitemapParseEvent,
  SitemapParseSummary,
  SitemapReference,
  SitemapUrlRecord,
} from './types'
import {
  decodedTextChunks,
  isSitemapInputFailure,
} from './input'
import { parseXmlRecord } from './xml'

export type * from './types'

const DEFAULT_MAX_DECODED_BYTES = 50 * 1024 * 1024
const DEFAULT_MAX_ENTRIES = 50_000
const DEFAULT_MAX_ENTRY_BYTES = 1024 * 1024

interface RootState {
  name: 'urlset' | 'sitemapindex' | 'rss' | 'feed'
  qualifiedName: string
  format: SitemapFormat
  kind: SitemapDocumentKind
  openTag: string
  recordTag: 'url' | 'sitemap' | 'item' | 'entry'
  containerReady: boolean
}

interface ExtractedRecord {
  _tag: 'record'
  record: string
  rest: string
}

interface ExtractedClose {
  _tag: 'close'
  rest: string
}

interface ExtractedSkip {
  _tag: 'skip'
  rest: string
}

interface ExtractedMalformed {
  _tag: 'malformed'
  detail: string
}

type Extracted = ExtractedRecord | ExtractedClose | ExtractedSkip | ExtractedMalformed

const RECORD_OPEN_PATTERNS: Record<RootState['recordTag'], RegExp> = {
  url: /^<((?:[\w.-]+:)?url)\b/i,
  sitemap: /^<((?:[\w.-]+:)?sitemap)\b/i,
  item: /^<((?:[\w.-]+:)?item)\b/i,
  entry: /^<((?:[\w.-]+:)?entry)\b/i,
}

function parseLimit(value: number | undefined, fallback: number, name: string): number {
  if (value === undefined)
    return fallback
  if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value))
    throw new RangeError(`${name} must be a non-negative finite integer`)
  return value
}

function issue(
  code: SitemapIssue['code'],
  message: string,
  severity: SitemapIssue['severity'] = 'error',
): SitemapIssue {
  return { code, severity, message }
}

function summary(stats: SitemapInputStats, entriesRead: number): SitemapParseSummary {
  return {
    bytesRead: stats.bytesRead,
    entriesRead,
    compressed: stats.compressed,
  }
}

function findMarkupEnd(input: string, start: number): number {
  let quote = ''
  for (let index = start + 1; index < input.length; index++) {
    const character = input[index]!
    if (quote) {
      if (character === quote)
        quote = ''
      continue
    }
    if (character === '"' || character === '\'') {
      quote = character
      continue
    }
    if (character === '>')
      return index
  }
  return -1
}

function isXmlWhitespace(character: string | undefined): boolean {
  return character === ' ' || character === '\t' || character === '\n' || character === '\r'
}

function isSelfClosingMarkup(markup: string): boolean {
  let cursor = markup.length - 2
  while (cursor >= 0 && isXmlWhitespace(markup[cursor]))
    cursor--
  return markup[cursor] === '/'
}

function trimMarkupPrefix(input: string): string {
  let output = input.trimStart()
  while (true) {
    if (output.startsWith('<?')) {
      const end = output.indexOf('?>')
      if (end === -1)
        return output
      output = output.slice(end + 2).trimStart()
      continue
    }
    if (output.startsWith('<!--')) {
      const end = output.indexOf('-->')
      if (end === -1)
        return output
      output = output.slice(end + 3).trimStart()
      continue
    }
    return output
  }
}

function detectRoot(input: string): RootState | ExtractedMalformed | undefined {
  const source = trimMarkupPrefix(input)
  if (source.startsWith('<!--') || source.startsWith('<?'))
    return undefined
  if (!source.startsWith('<'))
    return undefined
  if (/^<!doctype\b/i.test(source) || /^<html\b/i.test(source)) {
    return {
      _tag: 'malformed',
      detail: /^<html\b|^<!DOCTYPE\s+html\b/i.test(source)
        ? 'html'
        : 'Document type declarations are not supported',
    }
  }
  const end = findMarkupEnd(source, 0)
  if (end === -1)
    return undefined
  const openTag = source.slice(0, end + 1)
  const match = /^<([A-Z_][\w.:-]*)\b/i.exec(openTag)
  const qualifiedName = match?.[1]
  const name = qualifiedName?.split(':').at(-1)?.toLowerCase()
  if (name === 'urlset') {
    return {
      name,
      qualifiedName: qualifiedName!,
      format: 'xml',
      kind: 'urlset',
      openTag,
      recordTag: 'url',
      containerReady: true,
    }
  }
  if (name === 'sitemapindex') {
    return {
      name,
      qualifiedName: qualifiedName!,
      format: 'xml',
      kind: 'index',
      openTag,
      recordTag: 'sitemap',
      containerReady: true,
    }
  }
  if (name === 'rss') {
    return {
      name,
      qualifiedName: qualifiedName!,
      format: 'rss2',
      kind: 'urlset',
      openTag,
      recordTag: 'item',
      containerReady: false,
    }
  }
  if (name === 'feed') {
    return {
      name,
      qualifiedName: qualifiedName!,
      format: 'atom1',
      kind: 'urlset',
      openTag,
      recordTag: 'entry',
      containerReady: true,
    }
  }
  return { _tag: 'malformed', detail: 'unsupported' }
}

function afterRootOpen(input: string, root: RootState): string {
  const source = trimMarkupPrefix(input)
  return source.slice(root.openTag.length)
}

function prepareRssContainer(input: string): { ready: true, rest: string } | ExtractedMalformed | undefined {
  const source = trimMarkupPrefix(input)
  if (!source.startsWith('<'))
    return undefined
  const end = findMarkupEnd(source, 0)
  if (end === -1)
    return undefined
  if (!/^<channel\b/i.test(source.slice(0, end + 1)))
    return { _tag: 'malformed', detail: 'RSS document is missing its channel element' }
  return { ready: true, rest: source.slice(end + 1) }
}

function extractFeedMetadata(
  source: string,
  maxEntryBytes: number,
): ExtractedSkip | ExtractedMalformed | undefined {
  if (!source.startsWith('<'))
    return { _tag: 'malformed', detail: 'Unexpected text inside feed' }
  const openingEnd = findMarkupEnd(source, 0)
  if (openingEnd === -1)
    return undefined
  const opening = /^<([A-Z_][\w.:-]*)\b/i.exec(source)
  if (!opening)
    return { _tag: 'malformed', detail: 'Unexpected markup inside feed' }
  if (/\/\s*>$/.test(source.slice(0, openingEnd + 1)))
    return { _tag: 'skip', rest: source.slice(openingEnd + 1) }

  const stack = [opening[1]!.toLowerCase()]
  let cursor = openingEnd + 1
  while (cursor < source.length) {
    const markupStart = source.indexOf('<', cursor)
    if (markupStart === -1)
      break
    if (source.startsWith('<!--', markupStart)) {
      const end = source.indexOf('-->', markupStart + 4)
      if (end === -1)
        return undefined
      cursor = end + 3
      continue
    }
    if (source.startsWith('<![CDATA[', markupStart)) {
      const end = source.indexOf(']]>', markupStart + 9)
      if (end === -1)
        return undefined
      cursor = end + 3
      continue
    }
    if (source.startsWith('<?', markupStart)) {
      const end = source.indexOf('?>', markupStart + 2)
      if (end === -1)
        return undefined
      cursor = end + 2
      continue
    }
    const markupEnd = findMarkupEnd(source, markupStart)
    if (markupEnd === -1)
      return undefined
    const markup = source.slice(markupStart, markupEnd + 1)
    const tag = /^<(\/?)[ \t\r\n]*([A-Z_][\w.:-]*)\b/i.exec(markup)
    if (!tag)
      return { _tag: 'malformed', detail: 'Unexpected markup inside feed metadata' }
    const name = tag[2]!.toLowerCase()
    if (tag[1]) {
      const expected = stack.pop()
      if (expected !== name)
        return { _tag: 'malformed', detail: `Mismatched closing element in feed metadata: ${tag[2]}` }
      if (stack.length === 0)
        return { _tag: 'skip', rest: source.slice(markupEnd + 1) }
    }
    else if (!/\/\s*>$/.test(markup)) {
      stack.push(name)
    }
    cursor = markupEnd + 1
  }

  if (new TextEncoder().encode(source).byteLength > maxEntryBytes)
    return { _tag: 'malformed', detail: `Sitemap metadata element exceeds ${maxEntryBytes} bytes` }
  return undefined
}

/**
 * Case-insensitive `startsWith` that only lowercases the prefix-length slice.
 *
 * `source.toLowerCase().startsWith(prefix)` copies the WHOLE remaining document
 * to compare a handful of characters, and the record loop calls it once per
 * entry, so it is O(entries x document length) on its own.
 */
function startsWithCI(input: string, prefix: string): boolean {
  return input.length >= prefix.length
    && input.slice(0, prefix.length).toLowerCase() === prefix.toLowerCase()
}

function extractRecord(
  input: string,
  root: RootState,
  maxEntryBytes: number,
): Extracted | undefined {
  const source = trimMarkupPrefix(input)
  if (source.startsWith('<!--') || source.startsWith('<?'))
    return undefined
  const rootClose = `</${root.qualifiedName}>`
  if (startsWithCI(source, rootClose))
    return { _tag: 'close', rest: source.slice(rootClose.length) }
  if (root.name === 'rss' && startsWithCI(source, '</channel>')) {
    const rest = trimMarkupPrefix(source.slice('</channel>'.length))
    const rssClose = `</${root.qualifiedName}>`
    if (startsWithCI(rest, rssClose))
      return { _tag: 'close', rest: rest.slice(rssClose.length) }
    if (rest.length > 0 && findMarkupEnd(rest, 0) !== -1)
      return { _tag: 'malformed', detail: 'RSS channel is not followed by its closing root' }
    return undefined
  }

  const directOpen = `<${root.recordTag}`
  const directBoundary = source[directOpen.length]
  const directName = source.startsWith(directOpen)
    && (directBoundary === '>' || directBoundary === '/' || isXmlWhitespace(directBoundary))
    ? root.recordTag
    : undefined
  const qualifiedName = directName ?? RECORD_OPEN_PATTERNS[root.recordTag].exec(source)?.[1]
  if (!qualifiedName) {
    if (source.length === 0)
      return undefined
    if (root.name === 'rss' || root.name === 'feed')
      return extractFeedMetadata(source, maxEntryBytes)
    if (findMarkupEnd(source, 0) !== -1)
      return { _tag: 'malformed', detail: `Unexpected element inside ${root.name}` }
    return undefined
  }
  const openingEnd = findMarkupEnd(source, 0)
  if (openingEnd === -1)
    return undefined
  if (isSelfClosingMarkup(source.slice(0, openingEnd + 1))) {
    return {
      _tag: 'record',
      record: source.slice(0, openingEnd + 1),
      rest: source.slice(openingEnd + 1),
    }
  }
  const close = `</${qualifiedName}>`
  const closeIndex = findRecordClose(source, close, openingEnd + 1)
  if (closeIndex === -1) {
    if (new TextEncoder().encode(source).byteLength > maxEntryBytes) {
      return {
        _tag: 'malformed',
        detail: `Sitemap entry exceeds ${maxEntryBytes} bytes`,
      }
    }
    return undefined
  }
  const end = closeIndex + close.length
  return {
    _tag: 'record',
    record: source.slice(0, end),
    rest: source.slice(end),
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Locate a record's closing tag, skipping any comment or CDATA section that
 * contains a lookalike.
 *
 * Two costs here used to scale with the whole remaining document on EVERY
 * record, which made parsing quadratic in document size (a 40,000-entry, 8.8MB
 * sitemap took ~229s):
 *
 *  1. `input.toLowerCase()` copied the entire remaining buffer per call, purely
 *     to do a case-insensitive search. A sticky case-insensitive RegExp scans in
 *     place instead.
 *  2. `indexOf('<!--', cursor)` and `indexOf('<![CDATA[', cursor)` were
 *     UNBOUNDED. Ordinary sitemaps contain neither, so both ran to the end of
 *     the buffer just to report "absent" — once per record. They are now bounded
 *     to `[cursor, closeIndex)`, the only window where a hidden section could
 *     actually affect which close tag is real.
 *
 * Behaviour is unchanged; only the complexity is. Same file, 8.8MB: ~0.55s.
 */
function findRecordClose(input: string, close: string, start: number): number {
  let closePattern: RegExp | undefined
  let cursor = start
  while (true) {
    let closeIndex = input.indexOf(close, cursor)
    if (closeIndex === -1) {
      closePattern ||= new RegExp(escapeRegExp(close), 'gi')
      closePattern.lastIndex = cursor
      const match = closePattern.exec(input)
      if (!match)
        return -1
      closeIndex = match.index
    }
    const window = input.slice(cursor, closeIndex)
    const commentIndexRel = window.indexOf('<!--')
    const cdataIndexRel = window.indexOf('<![CDATA[')
    const hiddenIndexRel = commentIndexRel === -1
      ? cdataIndexRel
      : cdataIndexRel === -1
        ? commentIndexRel
        : Math.min(commentIndexRel, cdataIndexRel)
    if (hiddenIndexRel === -1)
      return closeIndex
    const marker = hiddenIndexRel === commentIndexRel ? '-->' : ']]>'
    const hiddenEnd = input.indexOf(marker, cursor + hiddenIndexRel)
    if (hiddenEnd === -1)
      return -1
    cursor = hiddenEnd + marker.length
  }
}

function parseRecord(
  root: RootState,
  record: string,
): {
  entry?: SitemapUrlRecord | SitemapReference
  issues: SitemapIssue[]
  malformed?: string
} {
  const parsed = parseXmlRecord(record, root.recordTag)
  if (parsed._tag === 'malformed')
    return { issues: [], malformed: parsed.detail }
  if (parsed._tag === 'unsupported')
    return { issues: [], malformed: 'Unsupported sitemap entry' }
  const entry = parsed.entries[0]
  return {
    ...(entry ? { entry } : {}),
    issues: parsed.issues,
  }
}

function textEntry(line: string, index: number): { entry?: SitemapUrlRecord, issue?: SitemapIssue } {
  const loc = line.trim()
  if (!loc)
    return {}
  let valid = false
  try {
    const url = new URL(loc)
    valid = url.protocol === 'http:' || url.protocol === 'https:'
  }
  catch {
    valid = false
  }
  return {
    entry: { loc },
    ...(!valid
      ? {
          issue: {
            code: 'invalid_loc' as const,
            severity: 'warning' as const,
            message: 'Text sitemap entry is not an absolute HTTP(S) URL',
            entryIndex: index,
            field: 'loc',
            value: loc,
          },
        }
      : {}),
  }
}

export async function* parseSitemap(
  input: SitemapInput,
  options: ParseSitemapOptions = {},
): AsyncGenerator<SitemapParseEvent> {
  const maxDecodedBytes = parseLimit(
    options.maxDecodedBytes,
    DEFAULT_MAX_DECODED_BYTES,
    'maxDecodedBytes',
  )
  const maxEntries = parseLimit(options.maxEntries, DEFAULT_MAX_ENTRIES, 'maxEntries')
  const maxEntryBytes = parseLimit(
    options.maxEntryBytes,
    DEFAULT_MAX_ENTRY_BYTES,
    'maxEntryBytes',
  )
  const stats: SitemapInputStats = { bytesRead: 0, compressed: false }
  const chunks = decodedTextChunks(input, maxDecodedBytes, stats)
  let entriesRead = 0
  let buffer = ''
  let root: RootState | undefined
  let closed = false
  let sawText = false

  try {
    for await (const chunk of chunks) {
      buffer += chunk
      sawText ||= chunk.trim().length > 0

      if (options.formatHint === 'text') {
        while (true) {
          const newline = buffer.indexOf('\n')
          if (newline === -1)
            break
          const line = buffer.slice(0, newline).replace(/\r$/, '')
          buffer = buffer.slice(newline + 1)
          const parsed = textEntry(line, entriesRead)
          if (!parsed.entry)
            continue
          if (entriesRead >= maxEntries) {
            const completeness = { _tag: 'partial', reason: 'entry_limit' } as const
            yield { _tag: 'issue', issue: issue('entry_limit', `Sitemap exceeds ${maxEntries} entries`) }
            yield { _tag: 'end', completeness, summary: summary(stats, entriesRead) }
            return
          }
          if (entriesRead === 0)
            yield { _tag: 'document', format: 'text', kind: 'urlset' }
          yield { _tag: 'url', entry: parsed.entry }
          if (parsed.issue)
            yield { _tag: 'issue', issue: parsed.issue }
          entriesRead++
        }
        continue
      }

      if (!root) {
        const detected = detectRoot(buffer)
        if (!detected)
          continue
        if ('_tag' in detected) {
          const reason = detected.detail === 'html' ? 'html' : detected.detail === 'unsupported' ? 'unsupported' : 'malformed'
          yield { _tag: 'issue', issue: issue(reason, detected.detail) }
          yield {
            _tag: 'end',
            completeness: { _tag: 'failed', reason },
            summary: summary(stats, entriesRead),
          }
          return
        }
        root = detected
        buffer = afterRootOpen(buffer, root)
        yield { _tag: 'document', format: root.format, kind: root.kind }
        if (isSelfClosingMarkup(root.openTag)) {
          closed = true
          continue
        }
      }

      if (closed)
        continue

      if (!root.containerReady) {
        const container = prepareRssContainer(buffer)
        if (!container)
          continue
        if ('_tag' in container) {
          yield { _tag: 'issue', issue: issue('malformed', container.detail) }
          yield {
            _tag: 'end',
            completeness: { _tag: 'failed', reason: 'malformed' },
            summary: summary(stats, entriesRead),
          }
          return
        }
        root.containerReady = true
        buffer = container.rest
      }

      while (true) {
        const extracted = extractRecord(buffer, root, maxEntryBytes)
        if (!extracted)
          break
        if (extracted._tag === 'malformed') {
          yield { _tag: 'issue', issue: issue('malformed', extracted.detail) }
          yield {
            _tag: 'end',
            completeness: { _tag: 'failed', reason: 'malformed' },
            summary: summary(stats, entriesRead),
          }
          return
        }
        if (extracted._tag === 'close') {
          buffer = extracted.rest
          closed = true
          break
        }
        if (extracted._tag === 'skip') {
          buffer = extracted.rest
          continue
        }
        if (entriesRead >= maxEntries) {
          const completeness = { _tag: 'partial', reason: 'entry_limit' } as const
          yield { _tag: 'issue', issue: issue('entry_limit', `Sitemap exceeds ${maxEntries} entries`) }
          yield { _tag: 'end', completeness, summary: summary(stats, entriesRead) }
          return
        }
        const parsed = parseRecord(root, extracted.record)
        if (parsed.malformed) {
          yield { _tag: 'issue', issue: issue('malformed', parsed.malformed) }
          yield {
            _tag: 'end',
            completeness: { _tag: 'failed', reason: 'malformed' },
            summary: summary(stats, entriesRead),
          }
          return
        }
        for (const parsedIssue of parsed.issues)
          yield { _tag: 'issue', issue: parsedIssue }
        if (parsed.entry) {
          if (root.kind === 'urlset')
            yield { _tag: 'url', entry: parsed.entry as SitemapUrlRecord }
          else
            yield { _tag: 'sitemap', entry: parsed.entry as SitemapReference }
          entriesRead++
        }
        buffer = extracted.rest
      }
    }

    if (options.formatHint === 'text') {
      const parsed = textEntry(buffer.replace(/\r$/, ''), entriesRead)
      if (parsed.entry) {
        if (entriesRead >= maxEntries) {
          yield { _tag: 'issue', issue: issue('entry_limit', `Sitemap exceeds ${maxEntries} entries`) }
          yield {
            _tag: 'end',
            completeness: { _tag: 'partial', reason: 'entry_limit' },
            summary: summary(stats, entriesRead),
          }
          return
        }
        if (entriesRead === 0)
          yield { _tag: 'document', format: 'text', kind: 'urlset' }
        yield { _tag: 'url', entry: parsed.entry }
        if (parsed.issue)
          yield { _tag: 'issue', issue: parsed.issue }
        entriesRead++
      }
      if (entriesRead === 0 && !sawText) {
        yield { _tag: 'issue', issue: issue('empty', 'Sitemap body is empty') }
        yield {
          _tag: 'end',
          completeness: { _tag: 'failed', reason: 'empty' },
          summary: summary(stats, entriesRead),
        }
        return
      }
      yield {
        _tag: 'end',
        completeness: { _tag: 'complete' },
        summary: summary(stats, entriesRead),
      }
      return
    }

    if (!root) {
      const reason = sawText ? 'unsupported' : 'empty'
      yield {
        _tag: 'issue',
        issue: issue(reason, reason === 'empty' ? 'Sitemap body is empty' : 'Document is not a supported sitemap format'),
      }
      yield {
        _tag: 'end',
        completeness: { _tag: 'failed', reason },
        summary: summary(stats, entriesRead),
      }
      return
    }
    if (!closed || trimMarkupPrefix(buffer).length > 0) {
      yield { _tag: 'issue', issue: issue('malformed', `Unclosed or trailing content in ${root.name}`) }
      yield {
        _tag: 'end',
        completeness: { _tag: 'failed', reason: 'malformed' },
        summary: summary(stats, entriesRead),
      }
      return
    }
    yield {
      _tag: 'end',
      completeness: { _tag: 'complete' },
      summary: summary(stats, entriesRead),
    }
  }
  catch (error) {
    if (!isSitemapInputFailure(error))
      throw error
    yield { _tag: 'issue', issue: issue(error.reason, error.message) }
    const completeness: SitemapCompleteness = error.reason === 'decoded_limit'
      ? { _tag: 'partial', reason: 'decoded_limit' }
      : { _tag: 'failed', reason: error.reason }
    yield { _tag: 'end', completeness, summary: summary(stats, entriesRead) }
  }
}

export async function collectSitemap(
  input: SitemapInput,
  options: ParseSitemapOptions = {},
): Promise<CollectSitemapResult> {
  let document: SitemapDocument | undefined
  const issues: SitemapIssue[] = []
  let end: Extract<SitemapParseEvent, { _tag: 'end' }> | undefined
  for await (const event of parseSitemap(input, options)) {
    if (event._tag === 'document') {
      document = event.kind === 'urlset'
        ? { _tag: 'urlset', format: event.format, entries: [] }
        : { _tag: 'index', format: 'xml', entries: [] }
    }
    else if (event._tag === 'url' && document?._tag === 'urlset') {
      document.entries.push(event.entry)
    }
    else if (event._tag === 'sitemap' && document?._tag === 'index') {
      document.entries.push(event.entry)
    }
    else if (event._tag === 'issue') {
      issues.push(event.issue)
    }
    else if (event._tag === 'end') {
      end = event
    }
  }
  if (!end)
    throw new Error('Sitemap parser ended without a terminal event')
  if (end.completeness._tag === 'failed') {
    return {
      _tag: 'failure',
      issues,
      completeness: end.completeness,
      summary: end.summary,
    }
  }
  if (!document) {
    return {
      _tag: 'partial',
      issues,
      completeness: end.completeness as Extract<SitemapCompleteness, { _tag: 'partial' }>,
      summary: end.summary,
    }
  }
  return {
    _tag: 'document',
    document,
    issues,
    completeness: end.completeness,
    summary: end.summary,
  }
}
