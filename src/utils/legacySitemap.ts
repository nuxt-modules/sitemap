import type {
  SitemapInput,
  SitemapIssue,
  SitemapUrlRecord,
} from 'sitemapd/parse'
import type {
  Changefreq,
  GoogleNewsEntry,
  ImageEntry,
  SitemapUrl,
  SitemapUrlInput,
  VideoEntry,
} from '../runtime/types'
import { parseSitemap } from 'sitemapd/parse'

/** @deprecated Use `SitemapIssue` with `parseSitemap` or `collectSitemap`. */
export interface SitemapWarning {
  type: 'validation'
  message: string
  context?: {
    url?: string
    field?: string
    value?: unknown
  }
}

/** @deprecated Use the tagged `CollectSitemapResult` returned by `collectSitemap`. */
export interface SitemapParseResult {
  urls: SitemapUrlInput[]
  warnings: SitemapWarning[]
}

/** @deprecated Use `SitemapReference`. */
export interface SitemapIndexEntry {
  loc: string
  lastmod?: string
}

/** @deprecated Use the tagged `CollectSitemapResult` returned by `collectSitemap`. */
export interface SitemapIndexParseResult {
  entries: SitemapIndexEntry[]
  warnings: SitemapWarning[]
}

/** @deprecated Use `SitemapInput`. */
export type SitemapXmlChunk = string | Uint8Array
/** @deprecated Use `SitemapInput`. */
export type SitemapXmlInput = SitemapInput

/** @deprecated Use `ParseSitemapOptions`. */
export interface SitemapStreamOptions {
  maxEntryBytes?: number
  maxBufferBytes?: number
}

/** @deprecated Use `SitemapParseEvent`. */
export type SitemapXmlStreamEvent
  = { _tag: 'url', url: SitemapUrlInput }
    | { _tag: 'warning', warning: SitemapWarning }

/** @deprecated Use `SitemapParseEvent`. */
export type SitemapIndexStreamEvent
  = { _tag: 'sitemap', sitemap: SitemapIndexEntry }
    | { _tag: 'warning', warning: SitemapWarning }

/** @deprecated Use `SitemapDocumentKind`. */
export type SitemapKind = 'urlset' | 'index'

/** @deprecated Use `SitemapParseEvent`. */
export type SitemapStreamEvent
  = { _tag: 'kind', kind: SitemapKind }
    | SitemapXmlStreamEvent
    | SitemapIndexStreamEvent

const CHANGE_FREQUENCIES = new Set<Changefreq>([
  'always',
  'hourly',
  'daily',
  'weekly',
  'monthly',
  'yearly',
  'never',
])

function legacyWarning(issue: SitemapIssue, kind: SitemapKind): SitemapWarning | undefined {
  if (issue.code === 'missing_loc') {
    return {
      type: 'validation',
      message: kind === 'index'
        ? 'Sitemap entry missing required loc element'
        : 'URL entry missing required loc element',
      ...(kind === 'urlset' ? { context: { url: 'undefined' } } : {}),
    }
  }
  if (issue.code === 'invalid_loc' && kind === 'index') {
    const url = String(issue.value)
    if (URL.canParse(url))
      return undefined
    return {
      type: 'validation',
      message: 'Sitemap entry has invalid URL',
      context: { url },
    }
  }
  if (issue.severity !== 'warning' || issue.code === 'invalid_loc')
    return undefined
  return {
    type: 'validation',
    message: issue.message,
    ...((issue.field || issue.value !== undefined)
      ? {
          context: {
            ...(issue.field ? { field: issue.field } : {}),
            ...(issue.value !== undefined ? { value: issue.value } : {}),
          },
        }
      : {}),
  }
}

function legacyImages(images: NonNullable<SitemapUrlRecord['extensions']>['images']): ImageEntry[] | undefined {
  return images?.map(image => ({
    loc: image.loc,
    ...(image.caption ? { caption: image.caption } : {}),
    ...(image.geoLocation ? { geo_location: image.geoLocation } : {}),
    ...(image.title ? { title: image.title } : {}),
    ...(image.license ? { license: image.license } : {}),
  }))
}

function legacyUrl(entry: SitemapUrlRecord): { url: SitemapUrl, warnings: SitemapWarning[] } {
  const warnings: SitemapWarning[] = []
  const url: SitemapUrl = { loc: entry.loc }

  if (entry.lastmod)
    url.lastmod = entry.lastmod

  if (entry.changefreq) {
    if (CHANGE_FREQUENCIES.has(entry.changefreq as Changefreq)) {
      url.changefreq = entry.changefreq as Changefreq
    }
    else {
      warnings.push({
        type: 'validation',
        message: 'Invalid changefreq value',
        context: { url: entry.loc, field: 'changefreq', value: entry.changefreq },
      })
    }
  }

  if (entry.priority !== undefined) {
    const priority = Number.parseFloat(entry.priority)
    if (Number.isNaN(priority)) {
      warnings.push({
        type: 'validation',
        message: 'Invalid priority value',
        context: { url: entry.loc, field: 'priority', value: entry.priority },
      })
    }
    else {
      if (priority < 0 || priority > 1) {
        warnings.push({
          type: 'validation',
          message: 'Priority value should be between 0.0 and 1.0, clamping to valid range',
          context: { url: entry.loc, field: 'priority', value: priority },
        })
      }
      url.priority = Math.max(0, Math.min(1, priority)) as SitemapUrl['priority']
    }
  }

  const extensions = entry.extensions
  if (extensions?.alternatives) {
    url.alternatives = extensions.alternatives.flatMap((alternative) => {
      if ((!alternative.rel || alternative.rel === 'alternate') && alternative.hreflang)
        return [{ hreflang: alternative.hreflang, href: alternative.href }]
      warnings.push({
        type: 'validation',
        message: 'Alternative link missing required rel="alternate", hreflang, or href',
        context: { url: entry.loc, field: 'link' },
      })
      return []
    })
  }
  const images = legacyImages(extensions?.images)
  if (images?.length)
    url.images = images
  if (extensions?.videos?.length)
    url.videos = extensions.videos as unknown as VideoEntry[]
  if (extensions?.news)
    url.news = extensions.news as unknown as GoogleNewsEntry

  return { url, warnings }
}

function positiveOption(value: number | undefined, name: string): number | undefined {
  if (value === undefined)
    return undefined
  if (!Number.isSafeInteger(value) || value < 1)
    throw new TypeError(`${name} must be a positive safe integer`)
  return value
}

function parserFailure(
  issue: SitemapIssue | undefined,
  kind: SitemapKind | undefined,
  options: SitemapStreamOptions,
): Error {
  if (issue?.code === 'empty')
    return new Error('Empty XML input provided')
  if (issue?.code === 'decoded_limit' && options.maxBufferBytes)
    return new Error(`Sitemap XML buffer exceeds maxBufferBytes of ${options.maxBufferBytes}`)
  const entryLimit = issue?.message.match(/^Sitemap entry exceeds (\d+) bytes$/)
  if (entryLimit)
    return new Error(`Sitemap entry exceeds maxEntryBytes of ${entryLimit[1]}`)
  if (issue?.code === 'unsupported' || issue?.code === 'html') {
    return new Error(
      kind === 'index'
        ? 'XML does not contain a valid sitemapindex element'
        : kind === 'urlset'
          ? 'XML does not contain a valid urlset element'
          : 'XML does not contain a valid sitemap element',
    )
  }
  return new Error(`Failed to parse XML: ${issue?.message || 'Malformed sitemap'}`)
}

async function* parseSitemapStreamInternal(
  input: SitemapXmlInput,
  options: SitemapStreamOptions = {},
  expectedKind?: SitemapKind,
): AsyncGenerator<SitemapStreamEvent> {
  const maxEntryBytes = positiveOption(options.maxEntryBytes, 'maxEntryBytes')
  const maxBufferBytes = positiveOption(options.maxBufferBytes, 'maxBufferBytes')
  let kind: SitemapKind | undefined
  let lastIssue: SitemapIssue | undefined
  let invalidUrlEntries = 0
  let validUrls = 0

  for await (const event of parseSitemap(input, {
    ...(maxEntryBytes ? { maxEntryBytes } : {}),
    ...(maxBufferBytes ? { maxDecodedBytes: maxBufferBytes } : {}),
  })) {
    if (event._tag === 'document') {
      if (event.format !== 'xml') {
        throw new Error(
          expectedKind === 'index'
            ? 'XML does not contain a valid sitemapindex element'
            : expectedKind === 'urlset'
              ? 'XML does not contain a valid urlset element'
              : 'XML does not contain a valid sitemap element',
        )
      }
      kind = event.kind
      yield { _tag: 'kind', kind }
    }
    else if (event._tag === 'issue') {
      lastIssue = event.issue
      if (!kind)
        continue
      if (event.issue.code === 'missing_loc' && kind === 'urlset')
        invalidUrlEntries++
      const warning = legacyWarning(event.issue, kind)
      if (warning)
        yield { _tag: 'warning', warning }
    }
    else if (event._tag === 'url') {
      validUrls++
      const mapped = legacyUrl(event.entry)
      for (const warning of mapped.warnings)
        yield { _tag: 'warning', warning }
      yield { _tag: 'url', url: mapped.url }
    }
    else if (event._tag === 'sitemap') {
      if (!URL.canParse(event.entry.loc))
        continue
      yield { _tag: 'sitemap', sitemap: event.entry }
    }
    else if (event.completeness._tag !== 'complete') {
      throw parserFailure(lastIssue, kind || expectedKind, options)
    }
  }

  if (kind === 'urlset' && invalidUrlEntries > 0 && validUrls === 0) {
    yield {
      _tag: 'warning',
      warning: {
        type: 'validation',
        message: 'No valid URLs found in sitemap after validation',
      },
    }
  }
}

/**
 * @deprecated Use `parseSitemap` from `@nuxtjs/sitemap/utils`. Canonical
 * streams emit `document`, `url`, `sitemap`, `issue`, and terminal `end`
 * events. URL and sitemap payloads use `entry`.
 */
export async function* parseSitemapStream(
  input: SitemapXmlInput,
  options: SitemapStreamOptions = {},
): AsyncGenerator<SitemapStreamEvent> {
  yield* parseSitemapStreamInternal(input, options)
}

/**
 * @deprecated Use `parseSitemap` from `@nuxtjs/sitemap/utils` and handle
 * events whose document kind is `urlset`.
 */
export async function* parseSitemapXmlStream(
  input: SitemapXmlInput,
  options: SitemapStreamOptions = {},
): AsyncGenerator<SitemapXmlStreamEvent> {
  for await (const event of parseSitemapStreamInternal(input, options, 'urlset')) {
    if (event._tag === 'kind') {
      if (event.kind !== 'urlset')
        throw new Error('XML does not contain a valid urlset element')
      continue
    }
    if (event._tag !== 'sitemap')
      yield event
  }
}

/**
 * @deprecated Use `parseSitemap` from `@nuxtjs/sitemap/utils` and handle
 * events whose document kind is `index`.
 */
export async function* parseSitemapIndexStream(
  input: SitemapXmlInput,
  options: SitemapStreamOptions = {},
): AsyncGenerator<SitemapIndexStreamEvent> {
  for await (const event of parseSitemapStreamInternal(input, options, 'index')) {
    if (event._tag === 'kind') {
      if (event.kind !== 'index')
        throw new Error('XML does not contain a valid sitemapindex element')
      continue
    }
    if (event._tag !== 'url')
      yield event
  }
}

/**
 * @deprecated Use `collectSitemap` from `@nuxtjs/sitemap/utils` and handle
 * its tagged result.
 */
export async function parseSitemapXml(xml: string): Promise<SitemapParseResult> {
  const urls: SitemapUrlInput[] = []
  const warnings: SitemapWarning[] = []
  for await (const event of parseSitemapXmlStream(xml)) {
    if (event._tag === 'url')
      urls.push(event.url)
    else
      warnings.push(event.warning)
  }
  return { urls, warnings }
}

/**
 * @deprecated Use `collectSitemap` from `@nuxtjs/sitemap/utils` and handle
 * an `index` document result.
 */
export async function parseSitemapIndex(xml: string): Promise<SitemapIndexParseResult> {
  const entries: SitemapIndexEntry[] = []
  const warnings: SitemapWarning[] = []
  for await (const event of parseSitemapIndexStream(xml)) {
    if (event._tag === 'sitemap')
      entries.push(event.sitemap)
    else
      warnings.push(event.warning)
  }
  return { entries, warnings }
}

/**
 * @deprecated Use `collectSitemap` from `@nuxtjs/sitemap/utils` and inspect
 * the tagged document result.
 */
export function isSitemapIndex(xml: string): boolean {
  return xml.includes('<sitemapindex') || xml.includes('sitemapindex>')
}
