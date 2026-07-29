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

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: true,
  isArray: name => ['url', 'sitemap', 'item', 'entry', 'image:image', 'video:video', 'xhtml:link', 'link', 'media:content', 'media:thumbnail'].includes(name),
})

function localName(name: string): string {
  return name.includes(':') ? name.slice(name.lastIndexOf(':') + 1) : name
}

function child(node: unknown, name: string): unknown {
  if (!node || typeof node !== 'object')
    return undefined
  const record = node as XmlNode
  const key = Object.keys(record).find(candidate => localName(candidate) === name)
  return key ? record[key] : undefined
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

export function parseXml(xml: string): ParsedSitemap {
  if (!xml.trimStart().startsWith('<'))
    return { _tag: 'unsupported' }
  const validation = XMLValidator.validate(xml)
  if (validation !== true)
    return { _tag: 'malformed', detail: validation.err.msg }

  let document: XmlNode
  try {
    document = parser.parse(xml) as XmlNode
  }
  catch (error) {
    return {
      _tag: 'malformed',
      detail: error instanceof Error ? error.message : String(error),
    }
  }

  const rootEntry = Object.entries(document).find(([name]) => !name.startsWith('?'))
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
