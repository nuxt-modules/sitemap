import {
  encodePath,
  hasProtocol,
  parsePath,
  parseQuery,
  parseURL,
  stringifyParsedURL,
  stringifyQuery,
  withoutTrailingSlash,
} from 'ufo'
import { defu } from 'defu'
import type {
  NitroUrlResolvers,
  ResolvedSitemapUrl,
  SitemapUrl,
} from '../../../types'
import { mergeOnKey } from '../../../utils-pure'

function resolve(s: string | URL, resolvers?: NitroUrlResolvers): string
function resolve(s: string | URL | undefined, resolvers?: NitroUrlResolvers): string | undefined
function resolve(s: string | URL | undefined, resolvers?: NitroUrlResolvers): string | undefined {
  if (typeof s === 'undefined')
    return undefined
  // convert url to string
  const str = typeof s === 'string' ? s : s.toString()
  if (!resolvers)
    return str
  // avoid transforming remote urls and urls already resolved
  if (hasProtocol(str, { acceptRelative: true, strict: false }))
    return resolvers.fixSlashes(str)

  return resolvers.canonicalUrlResolver(str)
}

function removeTrailingSlash(s: string) {
  // need to account for query strings and hashes
  // this assumes the URL is normalised
  return s.replace(/\/(\?|#|$)/, '$1')
}

export function preNormalizeEntry(_e: SitemapUrl | string, resolvers?: NitroUrlResolvers): ResolvedSitemapUrl {
  // Normalize url → loc before casting to ResolvedSitemapUrl
  const input = typeof _e === 'string' ? { loc: _e } : { ..._e }
  if (input.url && !input.loc) {
    input.loc = input.url
  }
  delete input.url
  if (typeof input.loc !== 'string') {
    input.loc = ''
  }
  const e = input as ResolvedSitemapUrl
  // we want a uniform loc so we can dedupe using it, remove slashes and only get the path
  e.loc = removeTrailingSlash(e.loc)
  e._abs = hasProtocol(e.loc, { acceptRelative: false, strict: false })
  try {
    e._path = e._abs ? parseURL(e.loc) : parsePath(e.loc)
  }
  catch {
    e._path = null
  }
  if (e._path) {
    const search = e._path.search
    // Skip parse/stringify if no query string
    const qs = search && search.length > 1
      ? stringifyQuery(parseQuery(search))
      : ''
    e._relativeLoc = `${encodePath(e._path.pathname)}${qs.length ? `?${qs}` : ''}`
    if (e._path.host) {
      e.loc = stringifyParsedURL(e._path)
    }
    else {
      e.loc = e._relativeLoc
    }
  }
  else if (!isEncoded(e.loc)) {
    e.loc = encodeURI(e.loc)
  }
  if (e.loc === '')
    e.loc = `/`
  e.loc = resolve(e.loc, resolvers)
  e._key = `${e._sitemap || ''}${withoutTrailingSlash(e.loc)}`
  return e as ResolvedSitemapUrl
}

export function isEncoded(url: string) {
  // checks, if an url is already decoded
  try {
    return url !== decodeURIComponent(url)
  }
  catch {
    return false
  }
}

export function normaliseEntry(_e: ResolvedSitemapUrl, defaults: Omit<SitemapUrl, 'loc'>, resolvers?: NitroUrlResolvers): ResolvedSitemapUrl {
  const e = defu(_e, defaults) as ResolvedSitemapUrl
  if (e.lastmod) {
    const date = normaliseDate(e.lastmod)
    if (date)
      e.lastmod = date
    else
      delete e.lastmod
  }
  // make sure it's valid
  if (!e.lastmod)
    delete e.lastmod

  // need to make sure siteURL doesn't have the base on the end
  e.loc = resolve(e.loc, resolvers)

  // correct alternative hrefs
  if (e.alternatives) {
    const alternatives = e.alternatives.map(a => ({ ...a }))
    for (const alt of alternatives) {
      if (typeof alt.href === 'string') {
        alt.href = resolve(alt.href, resolvers)
      }
      else if (typeof alt.href === 'object' && alt.href) {
        alt.href = resolve(alt.href.href, resolvers)
      }
    }
    e.alternatives = mergeOnKey(alternatives, 'hreflang')
  }

  if (e.images) {
    const images = e.images.map(i => ({ ...i }))
    for (const img of images) {
      img.loc = resolve(img.loc, resolvers)
    }
    e.images = mergeOnKey(images, 'loc')
  }

  if (e.videos) {
    const videos = e.videos.map(v => ({ ...v }))
    for (const video of videos) {
      if (video.content_loc) {
        video.content_loc = resolve(video.content_loc, resolvers)
      }
    }
    e.videos = mergeOnKey(videos, 'content_loc')
  }
  return e
}

const IS_VALID_W3C_DATE = [
  /(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))/,
  /^\d{4}-[01]\d-[0-3]\d$/,
  /^\d{4}-[01]\d$/,
  /^\d{4}$/,
]
export function isValidW3CDate(d: string) {
  return IS_VALID_W3C_DATE.some(r => r.test(d))
}

export function normaliseDate(date: string | Date): string
export function normaliseDate(d: Date | string) {
  // lastmod must adhere to W3C Datetime encoding rules
  if (typeof d === 'string') {
    // correct a time component without a timezone
    const tIdx = d.indexOf('T')
    if (tIdx !== -1) {
      const t = d.slice(tIdx + 1)
      if (!t.includes('+') && !t.includes('-') && !t.includes('Z')) {
        // add UTC timezone
        d += 'Z'
      }
    }
    // skip invalid w3c date
    if (!isValidW3CDate(d))
      return false
    // otherwise we need to parse it
    d = new Date(d)
    d.setMilliseconds(0)
    // check for invalid date
    if (Number.isNaN(d.getTime()))
      return false
  }
  const z = (n: number) => (`0${n}`).slice(-2)
  // need to normalise for google sitemap spec
  const date = `${d.getUTCFullYear()
  }-${
    z(d.getUTCMonth() + 1)
  }-${
    z(d.getUTCDate())
  }`
  // check if we have a time set
  if (d.getUTCHours() > 0 || d.getUTCMinutes() > 0 || d.getUTCSeconds() > 0) {
    return (
      `${date}T${
        z(d.getUTCHours())
      }:${
        z(d.getUTCMinutes())
      }:${
        z(d.getUTCSeconds())
      }Z`
    )
  }
  return date
}
