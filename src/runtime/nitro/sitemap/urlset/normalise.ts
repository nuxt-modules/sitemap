import { hasProtocol, parsePath, parseURL } from 'ufo'
import { defu } from 'defu'
import type {
  AlternativeEntry,
  NitroUrlResolvers,
  ResolvedSitemapUrl,
  SitemapUrl,
} from '../../../types'
import { mergeOnKey } from '../../../utils-pure'

function resolve(s: string | URL, resolvers?: NitroUrlResolvers): string
function resolve(s: string | undefined | URL, resolvers?: NitroUrlResolvers): string | undefined {
  if (typeof s === 'undefined' || !resolvers)
    return s
  // convert url to string
  s = typeof s === 'string' ? s : s.toString()
  // avoid transforming remote urls and urls already resolved
  if (hasProtocol(s, { acceptRelative: true, strict: false }))
    return resolvers.fixSlashes(s)

  return resolvers.canonicalUrlResolver(s)
}

function removeTrailingSlash(s: string) {
  // need to account for query strings and hashes
  // this assumes the URL is normalised
  return s.replace(/\/(\?|#|$)/, '$1')
}

export function preNormalizeEntry(_e: SitemapUrl | string): ResolvedSitemapUrl {
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
  if (e._path?.pathname === '')
    e.loc = `${e.loc}/`
  if (e._path) {
    e._key = `${e._sitemap || ''}${e._path?.pathname || '/'}${e._path.search}`
  }
  else {
    e._key = e.loc
  }
  return e as ResolvedSitemapUrl
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
    e.alternatives = mergeOnKey(e.alternatives.map((e) => {
      const a: AlternativeEntry & { key?: string } = { ...e }
      // string
      if (typeof a.href === 'string')
        a.href = resolve(a.href, resolvers)
      // URL object
      else if (typeof a.href === 'object' && a.href)
        a.href = resolve(a.href.href, resolvers)
      return a
    }), 'hreflang')
  }

  if (e.images) {
    e.images = mergeOnKey(e.images.map((i) => {
      i = { ...i }
      i.loc = resolve(i.loc, resolvers)
      return i
    }), 'loc')
  }

  if (e.videos) {
    e.videos = e.videos.map((v) => {
      v = { ...v }
      if (v.content_loc)
        v.content_loc = resolve(v.content_loc, resolvers)
      return v
    })
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
