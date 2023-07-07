import { joinURL, withoutTrailingSlash } from 'ufo'
import { defu } from 'defu'
import type {
  BuildSitemapIndexInput,
  BuildSitemapInput,
  ResolvedSitemapEntry,
  SitemapEntry,
  SitemapFullEntry,
  SitemapRenderCtx,
} from '../../types'
import { createFilter } from '../../util/urlFilter'
import { mergeOnKey } from '../../util/pageUtils'

export async function normaliseSitemapData(data: SitemapEntry[], options: BuildSitemapInput | BuildSitemapIndexInput) {
  const {
    defaults, exclude,
    include, autoLastmod,
    autoAlternativeLangPrefixes,
  } = options.moduleConfig
  // make sure include and exclude start with baseURL
  const combinedInclude = [...(options.sitemap?.include || []), ...(include || [])]
  const combinedExclude = [...(options.sitemap?.exclude || []), ...(exclude || [])]
  // base may be wrong here
  const urlFilter = createFilter({ include: combinedInclude, exclude: combinedExclude })

  function resolve(s: string): string
  function resolve(s: string | URL): string
  function resolve(s?: string | URL): string | undefined
  function resolve(s?: string | URL) {
    if (!s)
      return
    // convert url to string
    s = typeof s === 'string' ? s : s.toString()
    // avoid transforming remote urls and urls already resolved
    if (hasProtocol(s, { acceptRelative: true, strict: false }))
      return s

    return options.canonicalUrlResolver(s)
  }

  const defaultEntryData = { ...defaults || {} }
  if (autoLastmod)
    defaultEntryData.lastmod = defaultEntryData.lastmod || new Date()

  // make sure we're working with objects
  const entries = data
    .map(e => typeof e === 'string' ? { loc: e } : e)
    // uniform loc
    .map((e) => {
      // make fields writable so we can modify them
      e = { ...e }
      if (e.url) {
        e.loc = e.url
        delete e.url
      }
      // we want a uniform loc so we can dedupe using it, remove slashes and only get the path
      e.loc = withoutTrailingSlash(e.loc)
      e.loc = e.loc.replace('://', '').substring(e.loc.indexOf('/'))
      e.loc = e.loc === '' ? '/' : e.loc
      e = defu(e, defaultEntryData)
      return e
    })
    // apply route rules
    .map((e) => {
      const routeRules = options.getRouteRulesForPath(e.loc)
      // nuxt-simple-robots integration
      if (routeRules.index === false)
        return false
      return defu(routeRules.sitemap || {}, e)
    })
    .filter(e => e && urlFilter(e.loc))

  // apply auto alternative lang prefixes, needs to happen before normalization
  if (Array.isArray(autoAlternativeLangPrefixes)) {
    // otherwise add the entries
    entries.map((e) => {
      // // check the route doesn't start with a prefix
      // if (autoAlternativeLangPrefixes.some((prefix) => {
      //   return e.loc.startsWith(withBase(`/${prefix}`, options.baseURL))
      // }))
      //   return false
      e.alternatives = e.alternatives || autoAlternativeLangPrefixes.map(prefix => ({
        hreflang: prefix,
        href: joinURL(prefix, e.loc),
      }))
      return e
    })
  }

  function normaliseEntry(e: SitemapFullEntry): ResolvedSitemapEntry {
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
    e.loc = resolve(e.loc)
    //
    // // always convert to trailing slash for the index
    // if (e.loc === siteUrlWithoutBase && !siteUrlWithoutBase.endsWith('/'))
    //   e.loc = `${e.loc}/`

    // correct alternative hrefs
    if (e.alternatives) {
      e.alternatives = mergeOnKey(e.alternatives.map((a) => {
        a = { ...a }
        a.href = resolve(typeof a.href === 'string' ? a.href : a.href.href)
        return a
      }), 'href')
    }

    if (e.images) {
      e.images = mergeOnKey(e.images.map((i) => {
        i = { ...i }
        i.loc = resolve(i.loc)
        return i
      }), 'loc')
    }

    if (e.videos) {
      e.videos = e.videos.map((v) => {
        v = { ...v }
        v.contentLoc = resolve(v.contentLoc)
        return v
      })
    }

    // @todo normalise image href and src
    return e as ResolvedSitemapEntry
  }

  function normaliseEntries(entries: SitemapFullEntry[]) {
    return mergeOnKey(entries.map(normaliseEntry), 'loc')
      // sort based on logical string sorting of the loc
      .sort((a, b) => {
        if (a.loc > b.loc)
          return 1
        if (a.loc < b.loc)
          return -1
        return 0
      })
      .sort((a, b) => {
        // we need to sort based on the path segments as well
        const aSegments = a.loc.split('/').length
        const bSegments = b.loc.split('/').length
        if (aSegments > bSegments)
          return 1
        if (aSegments < bSegments)
          return -1
        return 0
      })
  }

  // do first round normalising of each entry
  const ctx: SitemapRenderCtx = { urls: normaliseEntries(entries), sitemapName: options.sitemap?.sitemapName || 'sitemap' }
  // call hook
  if (options.callHook)
    await options.callHook(ctx)

  return normaliseEntries(ctx.urls)
}

export function normaliseDate(date: Date): string
export function normaliseDate(date: Date | string | unknown) {
  const d = typeof date === 'string' ? new Date(date) : date
  if (!(d instanceof Date))
    return false
  const z = n => (`0${n}`).slice(-2)
  return (
    `${d.getUTCFullYear()
    }-${
      z(d.getUTCMonth() + 1)
    }-${
      z(d.getUTCDate())
    }T${
      z(d.getUTCHours())
    }:${
      z(d.getUTCMinutes())
    }:${
      z(d.getUTCSeconds())
    }+00:00`
  )
}
