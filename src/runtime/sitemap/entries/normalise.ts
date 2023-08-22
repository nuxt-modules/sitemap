import { hasProtocol, joinURL } from 'ufo'
import { defu } from 'defu'
import { fixSlashes } from 'site-config-stack'
import type {
  AlternativeEntry,
  BuildSitemapIndexInput,
  BuildSitemapInput,
  ResolvedSitemapEntry,
  SitemapEntry,
  SitemapEntryInput,
  SitemapRenderCtx,
} from '../../types'
import { createFilter } from '../../util/urlFilter'
import { mergeOnKey } from '../../util/pageUtils'

export async function normaliseSitemapData(data: SitemapEntryInput[], options: BuildSitemapInput | BuildSitemapIndexInput) {
  const {
    defaults, exclude,
    include, autoLastmod,
    autoI18n,
  } = options.moduleConfig
  // make sure include and exclude start with baseURL
  const combinedInclude = [...(options.sitemap?.include || []), ...(include || [])]
  const combinedExclude = [...(options.sitemap?.exclude || []), ...(exclude || [])]
  // base may be wrong here
  const urlFilter = createFilter({ include: combinedInclude, exclude: combinedExclude })

  function resolve(s: string): string
  function resolve(s: string | URL): string
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

  const defaultEntryData = defu(options.sitemap?.defaults, defaults)
  if (autoLastmod)
    defaultEntryData.lastmod = defaultEntryData.lastmod || new Date()

  // make sure we're working with objects
  let entries = data
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
      e.loc = fixSlashes(false, e.loc)
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

  // apply auto alternative lang prefixes, needs to happen before normalization
  if (autoI18n?.locales) {
    // we need to combine entries based on their loc minus the prefix
    const entriesByLoc: Record<string, string[]> = entries.reduce((acc, e) => {
      // need to match a autoAlternativeLangPrefixes and the url without the prefix
      const match = e.loc.match(new RegExp(`^/(${autoI18n.locales.map(l => l.code).join('|')})(.*)`))
      let loc = e.loc
      let prefix = autoI18n.defaultLocale
      if (match) {
        loc = match[2] || '/'
        prefix = match[1]
      }
      acc[loc] = acc[loc] || []
      acc[loc].push(prefix)
      return acc
    }, {})
    // now iterate them and see if any lang prefixes are missing
    Object.entries(entriesByLoc).forEach(([loc, prefixes]) => {
      // if we have all the prefixes, skip
      if (prefixes.length === autoI18n.locales.length)
        return
      // otherwise add the missing ones
      autoI18n.locales.map(l => l.code).forEach((prefix) => {
        if (!prefixes.includes(prefix)) {
          if (autoI18n.strategy === 'prefix')
            entries.push({ loc: joinURL(`/${prefix}`, loc) })
          else if (autoI18n.strategy === 'prefix_except_default')
            entries.push({ loc: prefix === autoI18n.defaultLocale ? loc : joinURL(`/${prefix}`, loc) })
        }
      })
    })
    // finally map the alternatives
    entries.map((e) => {
      let withoutPrefix = e.loc.replace(new RegExp(`^/(${autoI18n.locales.map(l => l.code).join('|')})(.*)`), '$2')
      withoutPrefix = withoutPrefix || '/'
      let xDefault = e.loc
      if (autoI18n.strategy === 'prefix') {
        // xDefault is the e.loc replacing the prefix with the default lang
        xDefault = joinURL('/', autoI18n.defaultLocale, withoutPrefix)
      }
      else if (autoI18n.strategy === 'prefix_except_default') {
        // xDefault is the e.loc without the prefix
        xDefault = withoutPrefix
      }
      e.alternatives = e.alternatives || [
        ...autoI18n.locales.map((locale) => {
          const isDefault = locale.code === autoI18n.defaultLocale
          let href = ''
          if (autoI18n.strategy === 'prefix') {
            href = joinURL(locale.code, withoutPrefix)
          }
          else if (autoI18n.strategy === 'prefix_except_default') {
            if (isDefault) {
              // no prefix
              href = withoutPrefix
            }
            else {
              href = joinURL('/', locale.code, withoutPrefix)
            }
          }
          const hreflang = locale.iso || locale.code
          return {
            hreflang,
            href,
          }
        }),
        { hreflang: 'x-default', href: xDefault },
      ]
      return e
    })
    if (autoI18n.strategy === 'prefix') {
      // need to strip any urls that don't have a prefix
      entries = entries.filter(e => e.loc.match(new RegExp(`^/(${autoI18n.locales.map(l => l.code).join('|')})(.*)`)))
    }
  }

  // remove filtered urls
  const filteredEntries = entries.filter(e => e && urlFilter(e.loc))

  function normaliseEntry(e: SitemapEntry): ResolvedSitemapEntry {
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

    // correct alternative hrefs
    if (e.alternatives) {
      e.alternatives = mergeOnKey(e.alternatives.map((e) => {
        const a: AlternativeEntry & { key?: string } = { ...e }
        a.href = resolve(typeof a.href === 'string' ? a.href : a.href.href)
        return a
      }), 'hreflang')
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

  function normaliseEntries(entries: SitemapEntry[]) {
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
  const ctx: SitemapRenderCtx = { urls: normaliseEntries(filteredEntries), sitemapName: options.sitemap?.sitemapName || 'sitemap' }
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
