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
  AlternativeEntry,
  NitroUrlResolvers,
  ResolvedSitemapUrl,
  SitemapUrl,
} from '../../../types'
import { pathCache } from '../cache/path-cache'

function resolve(s: string | URL, resolvers?: NitroUrlResolvers): string
function resolve(s: string | undefined | URL, resolvers?: NitroUrlResolvers): string | undefined {
  if (typeof s === 'undefined' || !resolvers)
    return s
  // convert url to string
  s = typeof s === 'string' ? s : s.toString()

  // Check cache first
  const cacheKey = `${s}::${resolvers.event.path}`
  const cached = pathCache.get(cacheKey)
  if (cached) {
    return cached
  }

  // avoid transforming remote urls and urls already resolved
  if (hasProtocol(s, { acceptRelative: true, strict: false })) {
    const result = resolvers.fixSlashes(s)
    pathCache.set(cacheKey, result)
    return result
  }

  const resolved = resolvers.canonicalUrlResolver(s)
  pathCache.set(cacheKey, resolved)
  return resolved
}

function removeTrailingSlash(s: string) {
  // need to account for query strings and hashes
  // this assumes the URL is normalised
  return s.replace(/\/(\?|#|$)/, '$1')
}

export function preNormalizeEntry(_e: SitemapUrl | string, resolvers?: NitroUrlResolvers): ResolvedSitemapUrl {
  const e = (typeof _e === 'string' ? { loc: _e } : { ..._e }) as ResolvedSitemapUrl
  if (e.url && !e.loc) {
    e.loc = e.url
    delete e.url
  }
  if (typeof e.loc !== 'string') {
    e.loc = ''
  }
  // we want a uniform loc so we can dedupe using it, remove slashes and only get the path
  e.loc = removeTrailingSlash(e.loc)
  e._abs = hasProtocol(e.loc, { acceptRelative: false, strict: false })
  try {
    e._path = e._abs ? parseURL(e.loc) : parsePath(e.loc)
  }
  catch (e) {
    e._path = null
  }
  if (e._path) {
    const query = parseQuery(e._path.search)
    const qs = stringifyQuery(query)
    e._relativeLoc = `${encodePath(e._path?.pathname)}${qs.length ? `?${qs}` : ''}`
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
  // Early exit for already normalized entries
  if (_e._normalized === true) {
    return _e
  }

  // Fast path for simple entries
  if (!_e.lastmod && !_e.alternatives && !_e.images && !_e.videos && !Object.keys(defaults).length) {
    const simple = { ..._e }
    simple.loc = resolve(simple.loc, resolvers)
    simple._normalized = true
    return simple as ResolvedSitemapUrl
  }

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
    // Map alternatives without merging for better performance
    e.alternatives = e.alternatives.map((e) => {
      const a: AlternativeEntry & { key?: string } = { ...e }
      // string
      if (typeof a.href === 'string')
        a.href = resolve(a.href, resolvers)
      // URL object
      else if (typeof a.href === 'object' && a.href)
        a.href = resolve(a.href.href, resolvers)
      return a
    })
  }

  if (e.images) {
    // Map images without merging for better performance
    e.images = e.images.map((i) => {
      i = { ...i }
      i.loc = resolve(i.loc, resolvers)
      return i
    })
  }

  if (e.videos) {
    e.videos = e.videos.map((v) => {
      v = { ...v }
      if (v.content_loc)
        v.content_loc = resolve(v.content_loc, resolvers)
      return v
    })
  }

  // Mark as normalized to avoid re-processing
  e._normalized = true
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
    if (d.includes('T')) {
      const t = d.split('T')[1]
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
