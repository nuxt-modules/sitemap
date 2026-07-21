import type { AlternativeEntry, GoogleNewsEntry, ImageEntry, SitemapStrict, SitemapUrl, SitemapUrlInput, VideoEntry } from '../runtime/types'
import type { SitemapIndexEntry } from './parseSitemapIndex'
import { XMLParser } from 'fast-xml-parser'

interface ParsedUrl {
  loc?: string
  lastmod?: string
  changefreq?: string
  priority?: string | number
  image?: ParsedImage | ParsedImage[]
  video?: ParsedVideo | ParsedVideo[]
  link?: ParsedLink | ParsedLink[]
  news?: ParsedNews
}

interface ParsedImage {
  loc?: string
}

interface ParsedVideo {
  title?: string
  thumbnail_loc?: string
  description?: string
  content_loc?: string
  player_loc?: string
  duration?: string | number
  expiration_date?: string
  rating?: string | number
  view_count?: string | number
  publication_date?: string
  family_friendly?: string
  requires_subscription?: string
  live?: string
  restriction?: {
    'relationship'?: string
    '#text'?: string
  }
  platform?: {
    'relationship'?: string
    '#text'?: string
  }
  price?: ParsedPrice | ParsedPrice[]
  uploader?: {
    'info'?: string
    '#text'?: string
  }
  tag?: string | string[]
}

interface ParsedPrice {
  '#text'?: string
  'currency'?: string
  'type'?: string
}

interface ParsedLink {
  rel?: string
  hreflang?: string
  href?: string
}

interface ParsedNews {
  title?: string
  publication_date?: string
  publication?: {
    name?: string
    language?: string
  }
}

export interface SitemapWarning {
  type: 'validation'
  message: string
  context?: {
    url?: string
    field?: string
    value?: unknown
  }
}

export interface SitemapParseResult {
  urls: SitemapUrlInput[]
  warnings: SitemapWarning[]
}

export type SitemapXmlChunk = string | Uint8Array

export type SitemapXmlInput
  = SitemapXmlChunk
    | Iterable<SitemapXmlChunk>
    | AsyncIterable<SitemapXmlChunk>
    | ReadableStream<SitemapXmlChunk>

export interface SitemapStreamOptions {
  maxEntryBytes?: number
  maxBufferBytes?: number
}

export type SitemapXmlStreamEvent
  = { _tag: 'url', url: SitemapUrlInput }
    | { _tag: 'warning', warning: SitemapWarning }

export type SitemapIndexStreamEvent
  = { _tag: 'sitemap', sitemap: SitemapIndexEntry }
    | { _tag: 'warning', warning: SitemapWarning }

export type SitemapKind = 'urlset' | 'index'

export type SitemapStreamEvent
  = { _tag: 'kind', kind: SitemapKind }
    | SitemapXmlStreamEvent
    | SitemapIndexStreamEvent

const DEFAULT_MAX_ENTRY_BYTES = 1024 * 1024
const ARRAY_TAGS = new Set(['url', 'image', 'video', 'link', 'tag', 'price'])
const CHANGE_FREQUENCIES: ReadonlySet<string> = new Set(['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'])
const SIMPLE_URL_FIELDS: ReadonlySet<string> = new Set(['loc', 'lastmod', 'changefreq', 'priority'])

function createUrlParser(): XMLParser {
  return new XMLParser({
    isArray: (tagName: string): boolean => ARRAY_TAGS.has(tagName),
    removeNSPrefix: true,
    parseAttributeValue: false,
    ignoreAttributes: false,
    attributeNamePrefix: '',
    trimValues: true,
  })
}

function isValidString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function parseNumber(value: unknown): number | undefined {
  if (typeof value === 'number')
    return value
  if (typeof value === 'string' && value.trim()) {
    const num = Number.parseFloat(value.trim())
    return Number.isNaN(num) ? undefined : num
  }
  return undefined
}

function parseInteger(value: unknown): number | undefined {
  if (typeof value === 'number')
    return Math.floor(value)
  if (typeof value === 'string' && value.trim()) {
    const num = Number.parseInt(value.trim(), 10)
    return Number.isNaN(num) ? undefined : num
  }
  return undefined
}

function extractUrlFromParsedElement(
  urlElement: ParsedUrl,
  warnings: SitemapWarning[],
): SitemapUrlInput | null {
  if (!isValidString(urlElement.loc)) {
    warnings.push({
      type: 'validation',
      message: 'URL entry missing required loc element',
      context: { url: String(urlElement.loc || 'undefined') },
    })
    return null
  }

  const urlObj: Partial<SitemapUrl> & { loc: string } = { loc: urlElement.loc }

  // Handle optional fields with validation
  if (isValidString(urlElement.lastmod)) {
    urlObj.lastmod = urlElement.lastmod
  }

  if (isValidString(urlElement.changefreq)) {
    if (CHANGE_FREQUENCIES.has(urlElement.changefreq)) {
      urlObj.changefreq = urlElement.changefreq as SitemapStrict['changefreq']
    }
    else {
      warnings.push({
        type: 'validation',
        message: 'Invalid changefreq value',
        context: { url: urlElement.loc, field: 'changefreq', value: urlElement.changefreq },
      })
    }
  }

  const priority = parseNumber(urlElement.priority)
  if (priority !== undefined && !Number.isNaN(priority)) {
    if (priority < 0 || priority > 1) {
      warnings.push({
        type: 'validation',
        message: 'Priority value should be between 0.0 and 1.0, clamping to valid range',
        context: { url: urlElement.loc, field: 'priority', value: priority },
      })
    }
    // Clamp priority to valid sitemap range
    urlObj.priority = Math.max(0, Math.min(1, priority)) as SitemapStrict['priority']
  }
  else if (urlElement.priority !== undefined) {
    warnings.push({
      type: 'validation',
      message: 'Invalid priority value',
      context: { url: urlElement.loc, field: 'priority', value: urlElement.priority },
    })
  }

  // Handle images
  if (urlElement.image) {
    const images = Array.isArray(urlElement.image) ? urlElement.image : [urlElement.image]
    const validImages: ImageEntry[] = []
    for (const image of images) {
      if (isValidString(image.loc)) {
        validImages.push({ loc: image.loc })
      }
      else {
        warnings.push({
          type: 'validation',
          message: 'Image missing required loc element',
          context: { url: urlElement.loc, field: 'image.loc' },
        })
      }
    }

    if (validImages.length > 0)
      urlObj.images = validImages
  }

  // Handle videos
  if (urlElement.video) {
    const videos = Array.isArray(urlElement.video) ? urlElement.video : [urlElement.video]
    const validVideos: VideoEntry[] = videos
      .map((video: ParsedVideo): VideoEntry | null => {
        // Check required fields
        const missingFields: string[] = []
        if (!isValidString(video.title))
          missingFields.push('title')
        if (!isValidString(video.thumbnail_loc))
          missingFields.push('thumbnail_loc')
        if (!isValidString(video.description))
          missingFields.push('description')
        if (!isValidString(video.content_loc))
          missingFields.push('content_loc')

        if (missingFields.length > 0) {
          warnings.push({
            type: 'validation',
            message: `Video missing required fields: ${missingFields.join(', ')}`,
            context: { url: urlElement.loc, field: 'video' },
          })
          return null
        }

        const videoObj: VideoEntry = {
          title: video.title!,
          thumbnail_loc: video.thumbnail_loc!,
          description: video.description!,
          content_loc: video.content_loc!,
        }

        // Handle optional video fields
        if (isValidString(video.player_loc)) {
          videoObj.player_loc = video.player_loc
        }

        const duration = parseInteger(video.duration)
        if (duration !== undefined) {
          videoObj.duration = duration
        }
        else if (video.duration !== undefined) {
          warnings.push({
            type: 'validation',
            message: 'Invalid video duration value',
            context: { url: urlElement.loc, field: 'video.duration', value: video.duration },
          })
        }

        if (isValidString(video.expiration_date)) {
          videoObj.expiration_date = video.expiration_date
        }

        const rating = parseNumber(video.rating)
        if (rating !== undefined) {
          if (rating < 0 || rating > 5) {
            warnings.push({
              type: 'validation',
              message: 'Video rating should be between 0.0 and 5.0',
              context: { url: urlElement.loc, field: 'video.rating', value: rating },
            })
          }
          videoObj.rating = rating
        }
        else if (video.rating !== undefined) {
          warnings.push({
            type: 'validation',
            message: 'Invalid video rating value',
            context: { url: urlElement.loc, field: 'video.rating', value: video.rating },
          })
        }

        const viewCount = parseInteger(video.view_count)
        if (viewCount !== undefined) {
          videoObj.view_count = viewCount
        }
        else if (video.view_count !== undefined) {
          warnings.push({
            type: 'validation',
            message: 'Invalid video view_count value',
            context: { url: urlElement.loc, field: 'video.view_count', value: video.view_count },
          })
        }

        if (isValidString(video.publication_date)) {
          videoObj.publication_date = video.publication_date
        }

        if (isValidString(video.family_friendly)) {
          const validValues = ['yes', 'no']
          if (validValues.includes(video.family_friendly)) {
            videoObj.family_friendly = video.family_friendly as VideoEntry['family_friendly']
          }
          else {
            warnings.push({
              type: 'validation',
              message: 'Invalid video family_friendly value, should be "yes" or "no"',
              context: { url: urlElement.loc, field: 'video.family_friendly', value: video.family_friendly },
            })
          }
        }

        if (isValidString(video.requires_subscription)) {
          const validValues = ['yes', 'no']
          if (validValues.includes(video.requires_subscription)) {
            videoObj.requires_subscription = video.requires_subscription as VideoEntry['requires_subscription']
          }
          else {
            warnings.push({
              type: 'validation',
              message: 'Invalid video requires_subscription value, should be "yes" or "no"',
              context: { url: urlElement.loc, field: 'video.requires_subscription', value: video.requires_subscription },
            })
          }
        }

        if (isValidString(video.live)) {
          const validValues = ['yes', 'no']
          if (validValues.includes(video.live)) {
            videoObj.live = video.live as VideoEntry['live']
          }
          else {
            warnings.push({
              type: 'validation',
              message: 'Invalid video live value, should be "yes" or "no"',
              context: { url: urlElement.loc, field: 'video.live', value: video.live },
            })
          }
        }

        // Handle restriction (element-based, not attribute-based)
        if (video.restriction && typeof video.restriction === 'object') {
          const restriction = video.restriction
          if (isValidString(restriction.relationship) && isValidString(restriction['#text'])) {
            const validRelationships = ['allow', 'deny']
            if (validRelationships.includes(restriction.relationship)) {
              videoObj.restriction = {
                relationship: restriction.relationship as 'allow' | 'deny',
                restriction: restriction['#text'],
              }
            }
            else {
              warnings.push({
                type: 'validation',
                message: 'Invalid video restriction relationship, should be "allow" or "deny"',
                context: { url: urlElement.loc, field: 'video.restriction.relationship', value: restriction.relationship },
              })
            }
          }
        }

        // Handle platform (element-based, not attribute-based)
        if (video.platform && typeof video.platform === 'object') {
          const platform = video.platform
          if (isValidString(platform.relationship) && isValidString(platform['#text'])) {
            const validRelationships = ['allow', 'deny']
            if (validRelationships.includes(platform.relationship)) {
              videoObj.platform = {
                relationship: platform.relationship as 'allow' | 'deny',
                platform: platform['#text'],
              }
            }
            else {
              warnings.push({
                type: 'validation',
                message: 'Invalid video platform relationship, should be "allow" or "deny"',
                context: { url: urlElement.loc, field: 'video.platform.relationship', value: platform.relationship },
              })
            }
          }
        }

        // Handle price - keep as strings to maintain precision
        if (video.price) {
          const prices = Array.isArray(video.price) ? video.price : [video.price]
          const validPrices = prices
            .map((price: ParsedPrice) => {
              const priceValue = price['#text']
              if (priceValue == null || (typeof priceValue !== 'string' && typeof priceValue !== 'number')) {
                warnings.push({
                  type: 'validation',
                  message: 'Video price missing value',
                  context: { url: urlElement.loc, field: 'video.price' },
                })
                return null
              }

              const validTypes = ['rent', 'purchase', 'package', 'subscription']
              if (price.type && !validTypes.includes(price.type)) {
                warnings.push({
                  type: 'validation',
                  message: `Invalid video price type "${price.type}", should be one of: ${validTypes.join(', ')}`,
                  context: { url: urlElement.loc, field: 'video.price.type', value: price.type },
                })
              }

              return {
                price: String(priceValue),
                currency: price.currency,
                type: price.type as NonNullable<VideoEntry['price']>[0]['type'],
              }
            })
            .filter((p): p is NonNullable<typeof p> => p !== null)

          if (validPrices.length > 0) {
            videoObj.price = validPrices
          }
        }

        // Handle uploader (element-based)
        if (video.uploader && typeof video.uploader === 'object') {
          const uploader = video.uploader
          if (isValidString(uploader.info) && isValidString(uploader['#text'])) {
            videoObj.uploader = {
              uploader: uploader['#text'],
              info: uploader.info,
            }
          }
          else {
            warnings.push({
              type: 'validation',
              message: 'Video uploader missing required info or name',
              context: { url: urlElement.loc, field: 'video.uploader' },
            })
          }
        }

        // Handle tags
        if (video.tag) {
          const tags = Array.isArray(video.tag) ? video.tag : [video.tag]
          const validTags = tags.filter(isValidString)

          if (validTags.length > 0) {
            videoObj.tag = validTags
          }
        }

        return videoObj
      })
      .filter((video): video is VideoEntry => video !== null)

    if (validVideos.length > 0) {
      urlObj.videos = validVideos
    }
  }

  // Handle alternatives (element-based xhtml:link)
  if (urlElement.link) {
    const links = Array.isArray(urlElement.link) ? urlElement.link : [urlElement.link]
    const alternatives: AlternativeEntry[] = links
      .map((link: ParsedLink): AlternativeEntry | null => {
        if (link.rel === 'alternate' && isValidString(link.hreflang) && isValidString(link.href)) {
          return {
            hreflang: link.hreflang,
            href: link.href,
          }
        }
        else {
          warnings.push({
            type: 'validation',
            message: 'Alternative link missing required rel="alternate", hreflang, or href',
            context: { url: urlElement.loc, field: 'link' },
          })
          return null
        }
      })
      .filter((alt): alt is AlternativeEntry => alt !== null)

    if (alternatives.length > 0) {
      urlObj.alternatives = alternatives
    }
  }

  // Handle news
  if (urlElement.news && typeof urlElement.news === 'object') {
    const news = urlElement.news as ParsedNews
    if (
      isValidString(news.title)
      && isValidString(news.publication_date)
      && news.publication
      && isValidString(news.publication.name)
      && isValidString(news.publication.language)
    ) {
      urlObj.news = {
        title: news.title!,
        publication_date: news.publication_date!,
        publication: {
          name: news.publication.name!,
          language: news.publication.language!,
        },
      } as GoogleNewsEntry
    }
    else {
      warnings.push({
        type: 'validation',
        message: 'News entry missing required fields (title, publication_date, publication.name, publication.language)',
        context: { url: urlElement.loc, field: 'news' },
      })
    }
  }

  return urlObj as SitemapUrl
}

interface ParsedTag {
  name: string
  closing: boolean
  selfClosing: boolean
}

function parseTag(xml: string, start: number, end: number): ParsedTag | null {
  let cursor = start + 1
  while (cursor < end && isXmlWhitespace(xml.charCodeAt(cursor)))
    cursor++

  const closing = xml.charCodeAt(cursor) === 47
  if (closing)
    cursor++

  if (cursor >= end || xml.charCodeAt(cursor) === 33 || xml.charCodeAt(cursor) === 63)
    return null

  const nameStart = cursor
  while (cursor < end) {
    const code = xml.charCodeAt(cursor)
    if (isXmlWhitespace(code) || code === 47)
      break
    cursor++
  }
  if (cursor === nameStart)
    return null

  const qualifiedName = xml.slice(nameStart, cursor)
  const colon = qualifiedName.lastIndexOf(':')
  let tail = end - 1
  while (tail > start && isXmlWhitespace(xml.charCodeAt(tail)))
    tail--

  return {
    name: colon === -1 ? qualifiedName : qualifiedName.slice(colon + 1),
    closing,
    selfClosing: !closing && xml.charCodeAt(tail) === 47,
  }
}

const URLSET_OPEN = 1
const URLSET_CLOSE = 2
const URLSET_SELF_CLOSING = 3
const URL_OPEN = 4
const URL_SELF_CLOSING = 5
const URL_CLOSE = 6
const SITEMAP_INDEX_OPEN = 7
const SITEMAP_INDEX_CLOSE = 8
const SITEMAP_INDEX_SELF_CLOSING = 9
const SITEMAP_OPEN = 10
const SITEMAP_SELF_CLOSING = 11
const SITEMAP_CLOSE = 12

function parseBoundaryTag(xml: string, start: number, end: number): number {
  let cursor = start + 1
  while (cursor < end && isXmlWhitespace(xml.charCodeAt(cursor)))
    cursor++

  const closing = xml.charCodeAt(cursor) === 47
  if (closing)
    cursor++
  if (cursor >= end || xml.charCodeAt(cursor) === 33 || xml.charCodeAt(cursor) === 63)
    return 0

  let localNameStart = cursor
  while (cursor < end) {
    const code = xml.charCodeAt(cursor)
    if (isXmlWhitespace(code) || code === 47)
      break
    if (code === 58)
      localNameStart = cursor + 1
    cursor++
  }
  const localNameLength = cursor - localNameStart
  let tail = end - 1
  while (tail > start && isXmlWhitespace(xml.charCodeAt(tail)))
    tail--
  const selfClosing = !closing && xml.charCodeAt(tail) === 47

  if (localNameLength === 3 && xml.startsWith('url', localNameStart)) {
    if (closing)
      return URL_CLOSE
    return selfClosing ? URL_SELF_CLOSING : URL_OPEN
  }
  if (localNameLength === 6 && xml.startsWith('urlset', localNameStart)) {
    if (closing)
      return URLSET_CLOSE
    return selfClosing ? URLSET_SELF_CLOSING : URLSET_OPEN
  }
  if (localNameLength === 12 && xml.startsWith('sitemapindex', localNameStart)) {
    if (closing)
      return SITEMAP_INDEX_CLOSE
    return selfClosing ? SITEMAP_INDEX_SELF_CLOSING : SITEMAP_INDEX_OPEN
  }
  if (localNameLength === 7 && xml.startsWith('sitemap', localNameStart)) {
    if (closing)
      return SITEMAP_CLOSE
    return selfClosing ? SITEMAP_SELF_CLOSING : SITEMAP_OPEN
  }
  return 0
}

function isXmlWhitespace(code: number): boolean {
  return code === 32 || code === 9 || code === 10 || code === 13
}

function findMarkupEnd(xml: string, start: number): number {
  if (xml.startsWith('<!--', start)) {
    const end = xml.indexOf('-->', start + 4)
    return end === -1 ? -1 : end + 2
  }
  if (xml.startsWith('<![CDATA[', start)) {
    const end = xml.indexOf(']]>', start + 9)
    return end === -1 ? -1 : end + 2
  }
  if (xml.startsWith('<?', start)) {
    const end = xml.indexOf('?>', start + 2)
    return end === -1 ? -1 : end + 1
  }

  let quote = 0
  for (let cursor = start + 1; cursor < xml.length; cursor++) {
    const code = xml.charCodeAt(cursor)
    if (quote) {
      if (code === quote)
        quote = 0
    }
    else if (code === 34 || code === 39) {
      quote = code
    }
    else if (code === 62) {
      return cursor
    }
  }
  return -1
}

function isAsyncIterable(input: SitemapXmlInput): input is AsyncIterable<SitemapXmlChunk> {
  return typeof input === 'object' && input !== null && Symbol.asyncIterator in input
}

function isIterable(input: SitemapXmlInput): input is Iterable<SitemapXmlChunk> {
  return typeof input === 'object' && input !== null && Symbol.iterator in input
}

function isReadableStream(input: SitemapXmlInput): input is ReadableStream<SitemapXmlChunk> {
  return typeof input === 'object' && input !== null && 'getReader' in input
}

async function* iterateInput(input: SitemapXmlInput): AsyncGenerator<SitemapXmlChunk> {
  if (typeof input === 'string' || input instanceof Uint8Array) {
    yield input
    return
  }
  if (isReadableStream(input)) {
    const reader = input.getReader()
    let completed = false
    try {
      while (true) {
        const result = await reader.read()
        if (result.done) {
          completed = true
          return
        }
        yield result.value
      }
    }
    finally {
      if (!completed)
        await reader.cancel()
      reader.releaseLock()
    }
  }
  if (isAsyncIterable(input)) {
    yield* input
    return
  }
  if (isIterable(input)) {
    yield* input
    return
  }
  throw new TypeError('Sitemap XML input must be a string, Uint8Array, iterable, or ReadableStream')
}

async function* decodeInput(input: SitemapXmlInput): AsyncGenerator<string> {
  let decoder = new TextDecoder()
  let decodingBytes = false
  for await (const chunk of iterateInput(input)) {
    if (typeof chunk === 'string') {
      if (decodingBytes) {
        const tail = decoder.decode()
        if (tail)
          yield tail
        decoder = new TextDecoder()
        decodingBytes = false
      }
      if (chunk)
        yield chunk
    }
    else if (chunk instanceof Uint8Array) {
      decodingBytes = true
      const text = decoder.decode(chunk, { stream: true })
      if (text)
        yield text
    }
    else {
      throw new TypeError('Sitemap XML chunks must be strings or Uint8Array values')
    }
  }
  if (decodingBytes) {
    const tail = decoder.decode()
    if (tail)
      yield tail
  }
}

function utf8ByteLength(value: string): number {
  let bytes = 0
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index)
    if (code < 0x80) {
      bytes++
    }
    else if (code < 0x800) {
      bytes += 2
    }
    else if (code >= 0xD800 && code <= 0xDBFF && index + 1 < value.length) {
      const next = value.charCodeAt(index + 1)
      if (next >= 0xDC00 && next <= 0xDFFF) {
        bytes += 4
        index++
      }
      else {
        bytes += 3
      }
    }
    else {
      bytes += 3
    }
  }
  return bytes
}

function exceedsUtf8ByteLimit(value: string, limit: number): boolean {
  if (value.length > limit)
    return true
  return value.length > Math.floor(limit / 3) && utf8ByteLength(value) > limit
}

function resolveMaxEntryBytes(options: SitemapStreamOptions): number {
  const value = options.maxEntryBytes ?? DEFAULT_MAX_ENTRY_BYTES
  if (!Number.isSafeInteger(value) || value < 1)
    throw new TypeError('maxEntryBytes must be a positive safe integer')
  return value
}

function resolveMaxBufferBytes(options: SitemapStreamOptions): number {
  const value = options.maxBufferBytes ?? DEFAULT_MAX_ENTRY_BYTES
  if (!Number.isSafeInteger(value) || value < 1)
    throw new TypeError('maxBufferBytes must be a positive safe integer')
  return value
}

function decodeXmlEntities(value: string): string {
  const firstEntity = value.indexOf('&')
  if (firstEntity === -1)
    return value

  let decoded = value.slice(0, firstEntity)
  let cursor = firstEntity
  while (cursor < value.length) {
    if (value.charCodeAt(cursor) !== 38) {
      decoded += value[cursor]
      cursor++
      continue
    }

    const end = value.indexOf(';', cursor + 1)
    if (end === -1) {
      decoded += value.slice(cursor)
      break
    }
    const entity = value.slice(cursor + 1, end)
    if (entity === 'amp') {
      decoded += '&'
    }
    else if (entity === 'lt') {
      decoded += '<'
    }
    else if (entity === 'gt') {
      decoded += '>'
    }
    else if (entity === 'quot') {
      decoded += '"'
    }
    else if (entity === 'apos') {
      decoded += '\''
    }
    else if (entity.charCodeAt(0) === 35) {
      const hex = entity.charCodeAt(1) === 120 || entity.charCodeAt(1) === 88
      const codePoint = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10)
      decoded += Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10FFFF && !(codePoint >= 0xD800 && codePoint <= 0xDFFF)
        ? String.fromCodePoint(codePoint)
        : value.slice(cursor, end + 1)
    }
    else {
      decoded += value.slice(cursor, end + 1)
    }
    cursor = end + 1
  }
  return decoded
}

function decodeElementContent(value: string): string | null {
  const firstMarkup = value.indexOf('<')
  if (firstMarkup === -1)
    return decodeXmlEntities(value.trim())

  let decoded = ''
  let cursor = 0
  while (cursor < value.length) {
    const markupStart = value.indexOf('<', cursor)
    if (markupStart === -1) {
      decoded += decodeXmlEntities(value.slice(cursor))
      break
    }
    decoded += decodeXmlEntities(value.slice(cursor, markupStart))
    if (value.startsWith('<![CDATA[', markupStart)) {
      const end = value.indexOf(']]>', markupStart + 9)
      if (end === -1)
        return null
      decoded += value.slice(markupStart + 9, end)
      cursor = end + 3
    }
    else if (value.startsWith('<!--', markupStart)) {
      const end = value.indexOf('-->', markupStart + 4)
      if (end === -1)
        return null
      cursor = end + 3
    }
    else {
      return null
    }
  }
  return decoded.trim()
}

function parseCommonUrlEntry(xml: string): ParsedUrl | null {
  if (!xml.startsWith('<url>'))
    return null

  const parsed: ParsedUrl = {}
  let seenFields = 0
  let cursor = 5
  while (cursor < xml.length) {
    while (cursor < xml.length && isXmlWhitespace(xml.charCodeAt(cursor)))
      cursor++
    if (xml.startsWith('</url>', cursor)) {
      cursor += 6
      while (cursor < xml.length && isXmlWhitespace(xml.charCodeAt(cursor)))
        cursor++
      return cursor === xml.length ? parsed : null
    }

    let name: 'loc' | 'lastmod' | 'changefreq' | 'priority'
    let fieldBit: number
    if (xml.startsWith('<loc>', cursor)) {
      name = 'loc'
      fieldBit = 1
    }
    else if (xml.startsWith('<lastmod>', cursor)) {
      name = 'lastmod'
      fieldBit = 2
    }
    else if (xml.startsWith('<changefreq>', cursor)) {
      name = 'changefreq'
      fieldBit = 4
    }
    else if (xml.startsWith('<priority>', cursor)) {
      name = 'priority'
      fieldBit = 8
    }
    else {
      return null
    }
    if (seenFields & fieldBit)
      return null
    seenFields |= fieldBit

    const contentStart = cursor + name.length + 2
    const closingTag = `</${name}>`
    const contentEnd = xml.indexOf(closingTag, contentStart)
    if (contentEnd === -1 || xml.indexOf('<', contentStart) !== contentEnd)
      return null
    parsed[name] = decodeXmlEntities(xml.slice(contentStart, contentEnd).trim())
    cursor = contentEnd + closingTag.length
  }
  return null
}

function parseSimpleUrlEntry(xml: string): ParsedUrl | null {
  const parsed: ParsedUrl = {}
  const seenFields = new Set<string>()
  let scanIndex = 0
  let depth = 0
  let field: string | undefined
  let contentStart = 0
  let closedUrl = false

  while (true) {
    const markupStart = xml.indexOf('<', scanIndex)
    if (markupStart === -1)
      break
    const markupEnd = findMarkupEnd(xml, markupStart)
    if (markupEnd === -1)
      return null
    const tag = parseTag(xml, markupStart, markupEnd)
    scanIndex = markupEnd + 1
    if (!tag)
      continue

    if (!tag.closing) {
      if (depth === 0 && tag.name === 'url') {
        if (tag.selfClosing)
          return {}
        depth = 1
        continue
      }
      if (depth !== 1 || !SIMPLE_URL_FIELDS.has(tag.name) || seenFields.has(tag.name))
        return null

      seenFields.add(tag.name)
      if (tag.selfClosing) {
        parsed[tag.name as keyof Pick<ParsedUrl, 'loc' | 'lastmod' | 'changefreq' | 'priority'>] = ''
        continue
      }
      field = tag.name
      contentStart = markupEnd + 1
      depth = 2
      continue
    }

    if (depth === 2 && field === tag.name) {
      const value = decodeElementContent(xml.slice(contentStart, markupStart))
      if (value === null)
        return null
      parsed[field as keyof Pick<ParsedUrl, 'loc' | 'lastmod' | 'changefreq' | 'priority'>] = value
      field = undefined
      depth = 1
    }
    else if (depth === 1 && tag.name === 'url') {
      closedUrl = true
      depth = 0
    }
    else {
      return null
    }
  }

  return closedUrl && depth === 0 ? parsed : null
}

function parseUrlEntry(parser: XMLParser, xml: string): ParsedUrl {
  const simple = parseCommonUrlEntry(xml) ?? parseSimpleUrlEntry(xml)
  if (simple)
    return simple

  try {
    const parsed = parser.parse(xml) as { url?: ParsedUrl | ParsedUrl[] }
    const value = Array.isArray(parsed?.url) ? parsed.url[0] : parsed?.url
    return value && typeof value === 'object' ? value : {}
  }
  catch (error) {
    throw new Error(`Failed to parse XML: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function parseSitemapEntry(parser: XMLParser, xml: string, warnings: SitemapWarning[]): SitemapIndexEntry | null {
  let parsed: { sitemap?: { loc?: string, lastmod?: string } }
  try {
    parsed = parser.parse(xml) as typeof parsed
  }
  catch (error) {
    throw new Error(`Failed to parse XML: ${error instanceof Error ? error.message : String(error)}`)
  }

  const loc = typeof parsed.sitemap?.loc === 'string' ? parsed.sitemap.loc.trim() : ''
  if (!loc) {
    warnings.push({
      type: 'validation',
      message: 'Sitemap entry missing required loc element',
    })
    return null
  }
  if (!URL.canParse(loc)) {
    warnings.push({
      type: 'validation',
      message: 'Sitemap entry has invalid URL',
      context: { url: loc },
    })
    return null
  }

  const entry: SitemapIndexEntry = { loc }
  if (typeof parsed.sitemap?.lastmod === 'string' && parsed.sitemap.lastmod.trim())
    entry.lastmod = parsed.sitemap.lastmod.trim()
  return entry
}

export async function* parseSitemapStream(
  input: SitemapXmlInput,
  options: SitemapStreamOptions = {},
): AsyncGenerator<SitemapStreamEvent> {
  const maxEntryBytes = resolveMaxEntryBytes(options)
  const maxBufferBytes = resolveMaxBufferBytes(options)
  const parser = createUrlParser()
  let buffer = ''
  let scanIndex = 0
  let entryStart = -1
  let sawInput = false
  let kind: SitemapKind | undefined
  let insideRoot = false
  let closedRoot = false
  let entryCount = 0
  let validUrlCount = 0

  for await (const chunk of decodeInput(input)) {
    sawInput = true
    buffer += chunk

    while (true) {
      const markupStart = buffer.indexOf('<', scanIndex)
      if (markupStart === -1) {
        scanIndex = buffer.length
        break
      }

      const markupEnd = findMarkupEnd(buffer, markupStart)
      if (markupEnd === -1) {
        scanIndex = markupStart
        break
      }

      const tag = parseBoundaryTag(buffer, markupStart, markupEnd)
      if (!kind && tag === 0) {
        const root = parseTag(buffer, markupStart, markupEnd)
        if (root && !root.closing)
          throw new Error('XML does not contain a valid sitemap element')
      }
      let record: string | undefined
      if (!kind && (tag === URLSET_OPEN || tag === URLSET_SELF_CLOSING)) {
        kind = 'urlset'
        insideRoot = tag === URLSET_OPEN
        closedRoot = tag === URLSET_SELF_CLOSING
        yield { _tag: 'kind', kind }
      }
      else if (!kind && (tag === SITEMAP_INDEX_OPEN || tag === SITEMAP_INDEX_SELF_CLOSING)) {
        kind = 'index'
        insideRoot = tag === SITEMAP_INDEX_OPEN
        closedRoot = tag === SITEMAP_INDEX_SELF_CLOSING
        yield { _tag: 'kind', kind }
      }
      else if (entryStart === -1 && (
        (kind === 'urlset' && tag === URLSET_CLOSE)
        || (kind === 'index' && tag === SITEMAP_INDEX_CLOSE)
      )) {
        insideRoot = false
        closedRoot = true
      }

      const openingEntry = kind === 'urlset'
        ? tag === URL_OPEN || tag === URL_SELF_CLOSING
        : tag === SITEMAP_OPEN || tag === SITEMAP_SELF_CLOSING
      const closingEntry = kind === 'urlset' ? tag === URL_CLOSE : tag === SITEMAP_CLOSE
      const selfClosingEntry = tag === URL_SELF_CLOSING || tag === SITEMAP_SELF_CLOSING

      if (insideRoot && openingEntry && entryStart === -1) {
        entryStart = markupStart
        if (selfClosingEntry)
          record = buffer.slice(entryStart, markupEnd + 1)
      }
      else if (closingEntry && entryStart !== -1) {
        record = buffer.slice(entryStart, markupEnd + 1)
      }

      if (!record) {
        scanIndex = markupEnd + 1
        continue
      }

      if (exceedsUtf8ByteLimit(record, maxEntryBytes))
        throw new Error(`Sitemap entry exceeds maxEntryBytes of ${maxEntryBytes}`)

      entryCount++
      const warnings: SitemapWarning[] = []
      scanIndex = markupEnd + 1
      entryStart = -1

      const entry = kind === 'urlset'
        ? extractUrlFromParsedElement(parseUrlEntry(parser, record), warnings)
        : parseSitemapEntry(parser, record, warnings)
      for (const warning of warnings)
        yield { _tag: 'warning', warning }
      if (kind === 'urlset' && entry) {
        validUrlCount++
        yield { _tag: 'url', url: entry as SitemapUrlInput }
      }
      else if (kind === 'index' && entry) {
        yield { _tag: 'sitemap', sitemap: entry as SitemapIndexEntry }
      }
    }

    if (entryStart !== -1) {
      if (buffer.length - entryStart > maxEntryBytes)
        throw new Error(`Sitemap entry exceeds maxEntryBytes of ${maxEntryBytes}`)
      if (entryStart > 0) {
        buffer = buffer.slice(entryStart)
        scanIndex -= entryStart
        entryStart = 0
      }
    }
    else if (scanIndex > 0) {
      buffer = buffer.slice(scanIndex)
      scanIndex = 0
    }
    if (entryStart === -1 && exceedsUtf8ByteLimit(buffer, maxBufferBytes))
      throw new Error(`Sitemap XML buffer exceeds maxBufferBytes of ${maxBufferBytes}`)
  }

  if (!sawInput)
    throw new Error('Empty XML input provided')
  if (entryStart !== -1)
    throw new Error(`Failed to parse XML: Unclosed ${kind === 'index' ? 'sitemap' : 'url'} element`)
  if (!kind)
    throw new Error('XML does not contain a valid sitemap element')
  if (!closedRoot)
    throw new Error(`Failed to parse XML: Unclosed ${kind === 'index' ? 'sitemapindex' : 'urlset'} element`)
  if (kind === 'urlset' && entryCount > 0 && validUrlCount === 0) {
    yield {
      _tag: 'warning',
      warning: {
        type: 'validation',
        message: 'No valid URLs found in sitemap after validation',
      },
    }
  }
}

export async function* parseSitemapXmlStream(
  input: SitemapXmlInput,
  options: SitemapStreamOptions = {},
): AsyncGenerator<SitemapXmlStreamEvent> {
  for await (const event of parseSitemapStream(input, options)) {
    if (event._tag === 'kind') {
      if (event.kind !== 'urlset')
        throw new Error('XML does not contain a valid urlset element')
      continue
    }
    if (event._tag === 'sitemap')
      continue
    yield event
  }
}

export async function* parseSitemapIndexStream(
  input: SitemapXmlInput,
  options: SitemapStreamOptions = {},
): AsyncGenerator<SitemapIndexStreamEvent> {
  for await (const event of parseSitemapStream(input, options)) {
    if (event._tag === 'kind') {
      if (event.kind !== 'index')
        throw new Error('XML does not contain a valid sitemapindex element')
      continue
    }
    if (event._tag === 'url')
      continue
    yield event
  }
}

export async function parseSitemapXml(xml: string): Promise<SitemapParseResult> {
  if (!xml)
    throw new Error('Empty XML input provided')

  const urls: SitemapUrlInput[] = []
  const warnings: SitemapWarning[] = []
  const parser = createUrlParser()
  let scanIndex = 0
  let entryStart = -1
  let sawUrlset = false
  let insideUrlset = false
  let closedUrlset = false
  let entryCount = 0

  while (true) {
    const markupStart = xml.indexOf('<', scanIndex)
    if (markupStart === -1)
      break
    const markupEnd = findMarkupEnd(xml, markupStart)
    if (markupEnd === -1)
      break

    const tag = parseBoundaryTag(xml, markupStart, markupEnd)
    let record: string | undefined
    if (tag === URLSET_OPEN) {
      sawUrlset = true
      insideUrlset = true
    }
    else if (tag === URLSET_SELF_CLOSING) {
      sawUrlset = true
      insideUrlset = false
      closedUrlset = true
    }
    else if (tag === URLSET_CLOSE && entryStart === -1) {
      insideUrlset = false
      closedUrlset = true
    }

    if (insideUrlset && (tag === URL_OPEN || tag === URL_SELF_CLOSING) && entryStart === -1) {
      entryStart = markupStart
      if (tag === URL_SELF_CLOSING)
        record = xml.slice(entryStart, markupEnd + 1)
    }
    else if (tag === URL_CLOSE && entryStart !== -1) {
      record = xml.slice(entryStart, markupEnd + 1)
    }
    scanIndex = markupEnd + 1

    if (!record)
      continue
    if (exceedsUtf8ByteLimit(record, DEFAULT_MAX_ENTRY_BYTES))
      throw new Error(`Sitemap URL entry exceeds maxEntryBytes of ${DEFAULT_MAX_ENTRY_BYTES}`)

    entryCount++
    entryStart = -1
    const url = extractUrlFromParsedElement(parseUrlEntry(parser, record), warnings)
    if (url)
      urls.push(url)
  }

  if (entryStart !== -1)
    throw new Error('Failed to parse XML: Unclosed url element')
  if (!sawUrlset)
    throw new Error('XML does not contain a valid urlset element')
  if (!closedUrlset)
    throw new Error('Failed to parse XML: Unclosed urlset element')
  if (entryCount > 0 && urls.length === 0) {
    warnings.push({
      type: 'validation',
      message: 'No valid URLs found in sitemap after validation',
    })
  }
  return { urls, warnings }
}
