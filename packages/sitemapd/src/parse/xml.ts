import type {
  SitemapAlternative,
  SitemapExtensions,
  SitemapImage,
  SitemapIssue,
  SitemapMediaContent,
  SitemapMediaThumbnail,
  SitemapReference,
  SitemapUrlRecord,
} from './types'
import { XMLParser, XMLValidator } from 'fast-xml-parser'

type XmlNode = Record<string, unknown>

export type ParsedSitemap
  = | { _tag: 'urlset', format: 'xml' | 'rss2' | 'atom1', entries: SitemapUrlRecord[], issues: SitemapIssue[] }
    | { _tag: 'index', format: 'xml', entries: SitemapReference[], issues: SitemapIssue[] }
    | { _tag: 'unsupported' }
    | { _tag: 'malformed', detail: string }

export type XmlRecordTag = 'url' | 'sitemap' | 'item' | 'entry'

const ARRAY_TAGS = new Set([
  'url',
  'sitemap',
  'item',
  'entry',
  'image:image',
  'video:video',
  'xhtml:link',
  'link',
  'media:content',
  'media:thumbnail',
])
const LOC_OPEN = '<loc>'
const LOC_CLOSE = '</loc>'
const LASTMOD_OPEN = '<lastmod>'
const LASTMOD_CLOSE = '</lastmod>'
const CHANGEFREQ_OPEN = '<changefreq>'
const CHANGEFREQ_CLOSE = '</changefreq>'
const PRIORITY_OPEN = '<priority>'
const PRIORITY_CLOSE = '</priority>'

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: true,
  isArray: name => ARRAY_TAGS.has(name),
})

function localName(name: string): string {
  return name.includes(':') ? name.slice(name.lastIndexOf(':') + 1) : name
}

function child(node: unknown, name: string): unknown {
  if (!node || typeof node !== 'object')
    return undefined
  const record = node as XmlNode
  if (name in record)
    return record[name]
  for (const key in record) {
    if (localName(key) === name)
      return record[key]
  }
  return undefined
}

function many(node: unknown, name: string): unknown[] {
  const value = child(node, name)
  if (value === undefined)
    return []
  return Array.isArray(value) ? value : [value]
}

function text(value: unknown): string | undefined {
  if (Array.isArray(value))
    return value.length === 1 ? text(value[0]) : undefined
  if (typeof value === 'string' && value.length > 0)
    return value
  if (typeof value === 'number')
    return String(value)
  if (value && typeof value === 'object') {
    const raw = (value as XmlNode)['#text']
    if (typeof raw === 'string' && raw.length > 0)
      return raw
  }
  return undefined
}

function attribute(node: unknown, name: string): string | undefined {
  if (!node || typeof node !== 'object')
    return undefined
  const value = (node as XmlNode)[name]
  if (Array.isArray(value))
    return value.length === 1 ? text(value[0]) : undefined
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function issueForLoc(loc: string | undefined, entryIndex: number): SitemapIssue | undefined {
  if (!loc) {
    return {
      code: 'missing_loc',
      severity: 'warning',
      message: 'Sitemap entry is missing its required location',
      entryIndex,
      field: 'loc',
    }
  }
  let valid = false
  try {
    const url = new URL(loc)
    valid = url.protocol === 'http:' || url.protocol === 'https:'
  }
  catch {
    valid = false
  }
  if (!valid) {
    return {
      code: 'invalid_loc',
      severity: 'warning',
      message: 'Sitemap entry location is not an absolute URL',
      entryIndex,
      field: 'loc',
      value: loc,
    }
  }
  return undefined
}

function simpleText(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed || undefined
}

function hasInvalidXmlText(value: string): boolean {
  if (value.includes(']]>'))
    return true
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index)
    if (code <= 0x08 || code === 0x0B || code === 0x0C || (code >= 0x0E && code <= 0x1F) || code >= 0xFFFE)
      return true
  }
  return false
}

function skipXmlWhitespace(input: string, start: number): number {
  let cursor = start
  while (cursor < input.length) {
    const code = input.charCodeAt(cursor)
    if (code !== 0x20 && code !== 0x09 && code !== 0x0A && code !== 0x0D)
      break
    cursor++
  }
  return cursor
}

function simpleFieldEnd(input: string, start: number, open: string, close: string): number {
  if (!input.startsWith(open, start))
    return -1
  const valueStart = start + open.length
  const end = input.indexOf(close, valueStart)
  if (end === -1)
    return -1
  const value = input.slice(valueStart, end)
  return value.includes('<') || value.includes('&') || value.includes('\r') || hasInvalidXmlText(value) ? -1 : end
}

// Keep the high volume, schema ordered case allocation light. Any XML feature
// that needs decoding or structural validation falls through to parseDocument.
function parseSimpleRecord(xml: string, recordTag: XmlRecordTag): ParsedSitemap | undefined {
  if (recordTag !== 'url' && recordTag !== 'sitemap')
    return undefined
  const recordOpen = recordTag === 'url' ? '<url>' : '<sitemap>'
  const recordClose = recordTag === 'url' ? '</url>' : '</sitemap>'
  if (!xml.startsWith(recordOpen))
    return undefined

  let cursor = skipXmlWhitespace(xml, recordOpen.length)
  const locEnd = simpleFieldEnd(xml, cursor, LOC_OPEN, LOC_CLOSE)
  if (locEnd === -1)
    return undefined
  const loc = simpleText(xml.slice(cursor + LOC_OPEN.length, locEnd))
  cursor = skipXmlWhitespace(xml, locEnd + LOC_CLOSE.length)

  let lastmod: string | undefined
  if (xml.startsWith(LASTMOD_OPEN, cursor)) {
    const lastmodEnd = simpleFieldEnd(xml, cursor, LASTMOD_OPEN, LASTMOD_CLOSE)
    if (lastmodEnd === -1)
      return undefined
    lastmod = simpleText(xml.slice(cursor + LASTMOD_OPEN.length, lastmodEnd))
    cursor = skipXmlWhitespace(xml, lastmodEnd + LASTMOD_CLOSE.length)
  }

  let changefreq: string | undefined
  if (recordTag === 'url' && xml.startsWith(CHANGEFREQ_OPEN, cursor)) {
    const changefreqEnd = simpleFieldEnd(xml, cursor, CHANGEFREQ_OPEN, CHANGEFREQ_CLOSE)
    if (changefreqEnd === -1)
      return undefined
    changefreq = simpleText(xml.slice(cursor + CHANGEFREQ_OPEN.length, changefreqEnd))
    cursor = skipXmlWhitespace(xml, changefreqEnd + CHANGEFREQ_CLOSE.length)
  }

  let priority: string | undefined
  if (recordTag === 'url' && xml.startsWith(PRIORITY_OPEN, cursor)) {
    const priorityEnd = simpleFieldEnd(xml, cursor, PRIORITY_OPEN, PRIORITY_CLOSE)
    if (priorityEnd === -1)
      return undefined
    priority = simpleText(xml.slice(cursor + PRIORITY_OPEN.length, priorityEnd))
    cursor = skipXmlWhitespace(xml, priorityEnd + PRIORITY_CLOSE.length)
  }

  if (!xml.startsWith(recordClose, cursor) || cursor + recordClose.length !== xml.length)
    return undefined

  const locIssue = issueForLoc(loc, 0)
  const issues = locIssue ? [locIssue] : []
  if (recordTag === 'sitemap') {
    return {
      _tag: 'index',
      format: 'xml',
      entries: loc ? [{ loc, ...(lastmod ? { lastmod } : {}) }] : [],
      issues,
    }
  }

  return {
    _tag: 'urlset',
    format: 'xml',
    entries: loc
      ? [{
          loc,
          ...(lastmod ? { lastmod } : {}),
          ...(changefreq ? { changefreq } : {}),
          ...(priority ? { priority } : {}),
        }]
      : [],
    issues,
  }
}

function imageEntries(node: unknown): SitemapImage[] {
  return many(node, 'image').flatMap((image) => {
    const loc = text(child(image, 'loc'))
    if (!loc)
      return []
    const caption = text(child(image, 'caption'))
    const geoLocation = text(child(image, 'geo_location'))
    const title = text(child(image, 'title'))
    const license = text(child(image, 'license'))
    return [{
      loc,
      ...(caption ? { caption } : {}),
      ...(geoLocation ? { geoLocation } : {}),
      ...(title ? { title } : {}),
      ...(license ? { license } : {}),
    }]
  })
}

function alternatives(node: unknown): SitemapAlternative[] {
  return many(node, 'link').flatMap((link) => {
    const href = attribute(link, 'href')
    const hreflang = attribute(link, 'hreflang')
    if (!href || !hreflang)
      return []
    const rel = attribute(link, 'rel')
    return [{ href, hreflang, ...(rel ? { rel } : {}) }]
  })
}

function media(node: unknown): SitemapExtensions['media'] | undefined {
  const contents: SitemapMediaContent[] = many(node, 'content').flatMap((content) => {
    const url = attribute(content, 'url')
    if (!url)
      return []
    const type = attribute(content, 'type')
    const medium = attribute(content, 'medium')
    return [{ url, ...(type ? { type } : {}), ...(medium ? { medium } : {}) }]
  })
  const thumbnails: SitemapMediaThumbnail[] = many(node, 'thumbnail').flatMap((thumbnail) => {
    const url = attribute(thumbnail, 'url')
    if (!url)
      return []
    const width = attribute(thumbnail, 'width')
    const height = attribute(thumbnail, 'height')
    return [{ url, ...(width ? { width } : {}), ...(height ? { height } : {}) }]
  })
  if (contents.length === 0 && thumbnails.length === 0)
    return undefined
  return {
    ...(contents.length > 0 ? { contents } : {}),
    ...(thumbnails.length > 0 ? { thumbnails } : {}),
  }
}

function localizeRecord(value: unknown): unknown {
  if (Array.isArray(value))
    return value.map(localizeRecord)
  if (!value || typeof value !== 'object')
    return value
  return Object.fromEntries(
    Object.entries(value as XmlNode).map(([key, childValue]) => [
      localName(key),
      localizeRecord(childValue),
    ]),
  )
}

function extensions(node: unknown): SitemapExtensions | undefined {
  if (!node || typeof node !== 'object')
    return undefined
  let hasExtension = false
  for (const key in node as XmlNode) {
    const name = localName(key)
    if (name === 'image' || name === 'link' || name === 'content' || name === 'thumbnail' || name === 'video' || name === 'news') {
      hasExtension = true
      break
    }
  }
  if (!hasExtension)
    return undefined
  const images = imageEntries(node)
  const alternateEntries = alternatives(node)
  const mediaEntries = media(node)
  const videos = many(node, 'video')
    .filter(value => value && typeof value === 'object')
    .map(value => localizeRecord(value) as Record<string, unknown>)
  const news = child(node, 'news')
  if (images.length === 0 && alternateEntries.length === 0 && !mediaEntries && videos.length === 0 && !news)
    return undefined
  return {
    ...(images.length > 0 ? { images } : {}),
    ...(alternateEntries.length > 0 ? { alternatives: alternateEntries } : {}),
    ...(videos.length > 0 ? { videos } : {}),
    ...(news && typeof news === 'object' ? { news: localizeRecord(news) as Record<string, unknown> } : {}),
    ...(mediaEntries ? { media: mediaEntries } : {}),
  }
}

function urlRecord(node: unknown, loc: string): SitemapUrlRecord {
  const lastmod = text(child(node, 'lastmod'))
  const changefreq = text(child(node, 'changefreq'))
  const priority = text(child(node, 'priority'))
  const parsedExtensions = extensions(node)
  return {
    loc,
    ...(lastmod ? { lastmod } : {}),
    ...(changefreq ? { changefreq } : {}),
    ...(priority ? { priority } : {}),
    ...(parsedExtensions ? { extensions: parsedExtensions } : {}),
  }
}

function parseUrlset(root: unknown): Extract<ParsedSitemap, { _tag: 'urlset' }> {
  const issues: SitemapIssue[] = []
  const entries: SitemapUrlRecord[] = []
  for (const [index, node] of many(root, 'url').entries()) {
    const loc = text(child(node, 'loc'))
    const locIssue = issueForLoc(loc, index)
    if (locIssue)
      issues.push(locIssue)
    if (loc)
      entries.push(urlRecord(node, loc))
  }
  return { _tag: 'urlset', format: 'xml', entries, issues }
}

function parseIndex(root: unknown): Extract<ParsedSitemap, { _tag: 'index' }> {
  const issues: SitemapIssue[] = []
  const entries: SitemapReference[] = []
  for (const [index, node] of many(root, 'sitemap').entries()) {
    const loc = text(child(node, 'loc'))
    const locIssue = issueForLoc(loc, index)
    if (locIssue)
      issues.push(locIssue)
    if (!loc)
      continue
    const lastmod = text(child(node, 'lastmod'))
    entries.push({ loc, ...(lastmod ? { lastmod } : {}) })
  }
  return { _tag: 'index', format: 'xml', entries, issues }
}

function parseRss(root: unknown): Extract<ParsedSitemap, { _tag: 'urlset' }> {
  const issues: SitemapIssue[] = []
  const entries: SitemapUrlRecord[] = []
  const channel = child(root, 'channel')
  for (const [index, item] of many(channel, 'item').entries()) {
    const loc = text(child(item, 'link'))
    const locIssue = issueForLoc(loc, index)
    if (locIssue)
      issues.push(locIssue)
    if (!loc)
      continue
    const lastmod = text(child(item, 'pubDate'))
    const parsedMedia = media(item)
    entries.push({
      loc,
      ...(lastmod ? { lastmod } : {}),
      ...(parsedMedia ? { extensions: { media: parsedMedia } } : {}),
    })
  }
  return { _tag: 'urlset', format: 'rss2', entries, issues }
}

function parseAtom(root: unknown): Extract<ParsedSitemap, { _tag: 'urlset' }> {
  const issues: SitemapIssue[] = []
  const entries: SitemapUrlRecord[] = []
  for (const [index, entry] of many(root, 'entry').entries()) {
    const links = many(entry, 'link')
    const alternate = links.find(link => !attribute(link, 'rel') || attribute(link, 'rel') === 'alternate')
    const loc = alternate ? attribute(alternate, 'href') : undefined
    const locIssue = issueForLoc(loc, index)
    if (locIssue)
      issues.push(locIssue)
    if (!loc)
      continue
    const lastmod = text(child(entry, 'updated')) ?? text(child(entry, 'published'))
    const parsedMedia = media(entry)
    entries.push({
      loc,
      ...(lastmod ? { lastmod } : {}),
      ...(parsedMedia ? { extensions: { media: parsedMedia } } : {}),
    })
  }
  return { _tag: 'urlset', format: 'atom1', entries, issues }
}

function parseDocument(xml: string): { _tag: 'document', document: XmlNode } | Extract<ParsedSitemap, { _tag: 'malformed' }> {
  const validation = XMLValidator.validate(xml)
  if (validation !== true)
    return { _tag: 'malformed', detail: validation.err.msg }

  try {
    return { _tag: 'document', document: parser.parse(xml) as XmlNode }
  }
  catch (error) {
    return {
      _tag: 'malformed',
      detail: error instanceof Error ? error.message : String(error),
    }
  }
}

export function parseXmlRecord(xml: string, recordTag: XmlRecordTag): ParsedSitemap {
  const simple = parseSimpleRecord(xml, recordTag)
  if (simple)
    return simple
  const parsed = parseDocument(xml)
  if (parsed._tag === 'malformed')
    return parsed

  const rootEntry = Object.entries(parsed.document).find(([name]) => !name.startsWith('?'))
  if (!rootEntry || localName(rootEntry[0]).toLowerCase() !== recordTag) {
    return recordTag === 'sitemap'
      ? { _tag: 'index', format: 'xml', entries: [], issues: [] }
      : {
          _tag: 'urlset',
          format: recordTag === 'item' ? 'rss2' : recordTag === 'entry' ? 'atom1' : 'xml',
          entries: [],
          issues: [],
        }
  }

  const root = rootEntry[1]
  switch (recordTag) {
    case 'url':
      return parseUrlset({ url: root })
    case 'sitemap':
      return parseIndex({ sitemap: root })
    case 'item':
      return parseRss({ channel: { item: root } })
    case 'entry':
      return parseAtom({ entry: root })
  }
}

export function parseXml(xml: string): ParsedSitemap {
  if (!xml.trimStart().startsWith('<'))
    return { _tag: 'unsupported' }
  const parsed = parseDocument(xml)
  if (parsed._tag === 'malformed')
    return parsed

  const rootEntry = Object.entries(parsed.document).find(([name]) => !name.startsWith('?'))
  if (!rootEntry)
    return { _tag: 'unsupported' }
  const [rootName, root] = rootEntry
  switch (localName(rootName).toLowerCase()) {
    case 'urlset':
      return parseUrlset(root)
    case 'sitemapindex':
      return parseIndex(root)
    case 'rss':
      return parseRss(root)
    case 'feed':
      return parseAtom(root)
    default:
      return { _tag: 'unsupported' }
  }
}
