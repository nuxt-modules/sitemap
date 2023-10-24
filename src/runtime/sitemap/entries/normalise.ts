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
    defaults,
    exclude,
    include,
    autoLastmod,
    autoI18n,
    isI18nMap,
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
    if (hasProtocol(s, { acceptRelative: true, strict: false })) {
      // check if the host starts with the siteURL
      if (s.startsWith(options.canonicalUrlResolver('/')))
        // strip the siteURL
        s = s.replace(options.canonicalUrlResolver('/'), '')
      else
        return s
    }

    return options.canonicalUrlResolver(s)
  }

  const defaultEntryData = defu(options.sitemap?.defaults, defaults)
  if (autoLastmod)
    defaultEntryData.lastmod = defaultEntryData.lastmod || new Date()

  // make sure we're working with objects
  let entries: SitemapEntry[] = data
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
    .filter(Boolean)

  // apply auto alternative lang prefixes, needs to happen before normalization
  if (autoI18n?.locales) {
    // we need to combine entries based on their loc minus the prefix
    const entriesByLoc: Record<string, { entry: any; prefix: string }[]> = entries.reduce((acc, e) => {
      // need to match a autoAlternativeLangPrefixes and the url without the prefix
      const match = e.loc.match(new RegExp(`^/(${autoI18n.locales.map(l => l.code).join('|')})(.*)`))
      let loc = e.loc
      let prefix = null
      if (match) {
        loc = match[2] || '/'
        prefix = match[1]
      }
      acc[loc] = acc[loc] || []
      acc[loc].push({ entry: e, prefix })
      return acc
    }, {})
    // now iterate them and see if any lang prefixes are missing
    Object.entries(entriesByLoc).forEach(([loc, childEntry]) => {
      // otherwise add the missing ones
      autoI18n.locales.map(l => l.code).forEach((prefix) => {
        if (!childEntry.map(e => e.prefix).filter(Boolean).includes(prefix)) {
          if (autoI18n.strategy === 'prefix')
            entries.push({ ...childEntry[0].entry, loc: joinURL(`/${prefix}`, loc) })
          else if (autoI18n.strategy === 'prefix_except_default')
            entries.push({ ...childEntry[0].entry, loc: prefix === autoI18n.defaultLocale ? loc : joinURL(`/${prefix}`, loc) })
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
            href = joinURL('/', locale.code, withoutPrefix)
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

  // if we have isI18nMap we split the sitemap based on the name (locale)
  let filteredEntries = entries.filter(e => e && urlFilter(e.loc))
  if (isI18nMap && options.sitemap?.sitemapName) {
    // filter for locales
    const locale = options.sitemap?.sitemapName
    // check the entry loc matches the alternatives hreflang for the locale
    filteredEntries = filteredEntries.filter((e) => {
      const alternativeEntry = e.alternatives?.find(a => a.hreflang === locale)
      if (!alternativeEntry)
        return false
      return alternativeEntry.href === e.loc
    })
  }

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
        // string
        if (typeof a.href === 'string')
          a.href = resolve(a.href)
        // URL object
        else if (typeof a.href === 'object' && a.href)
          a.href = resolve(a.href.href)
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

  function sortEntries(entries: SitemapEntry[]) {
    if (options.moduleConfig.sortEntries) {
      // sort based on logical string sorting of the loc, we need to properly account for numbers here
      // so that urls: /route/1, /route/2 is displayed instead of /route/1, /route/10
      return entries
        .sort((a, b) => {
          return a.loc.localeCompare(b.loc, undefined, { numeric: true })
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
    return entries
  }

  function normaliseEntries(entries: SitemapEntry[]) {
    return sortEntries(mergeOnKey(entries.map(normaliseEntry), 'loc'))
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
