import { statSync } from 'node:fs'
import { withBase, withTrailingSlash, withoutTrailingSlash } from 'ufo'
import { defu } from 'defu'
import type { ResolvedSitemapEntry, SitemapEntry, SitemapFullEntry } from '../../types'
import { createFilter } from './urlFilter'
import { resolvePagesRoutes, uniqueBy } from './pageUtils'
import { normaliseDate } from './normalise'
import type { BuildSitemapOptions } from './builder'

export async function generateSitemapEntries(options: BuildSitemapOptions) {
  const {
    urls: configUrls,
    defaults, exclude,
    extensions,
    isNuxtContentDocumentDriven,
    include, pagesDirs, trailingSlash, inferStaticPagesAsRoutes, hasApiRoutesUrl, autoLastmod, siteUrl,
  } = options.sitemapConfig
  const urlFilter = createFilter({ include, exclude })

  const defaultEntryData = { ...defaults }
  if (autoLastmod)
    defaultEntryData.lastmod = defaultEntryData.lastmod || new Date()

  const fixLoc = (url: string) => withBase(encodeURI(trailingSlash ? withTrailingSlash(url) : withoutTrailingSlash(url)), options.baseURL)

  function preNormalise(entries: SitemapEntry[]) {
    return (uniqueBy(
      entries
        .map(e => typeof e === 'string' ? { loc: e } : e)
        .map(e => ({ ...defaults, ...e }))
        .map(e => ({ ...e, loc: fixLoc(e.loc || e.url) })),
      'loc',
    ) as SitemapFullEntry[])
      .filter(e => urlFilter(e.loc!))
      .sort((a, b) => a.loc!.length - b.loc!.length)
      .map((e) => {
        delete e.url
        if (e.lastmod)
          e.lastmod = normaliseDate(e.lastmod)
        return e
      })
  }
  function postNormalise(e: ResolvedSitemapEntry) {
    e.loc = withBase(e.loc, siteUrl || '')
    return e
  }

  const pageUrls = inferStaticPagesAsRoutes
    ? (await resolvePagesRoutes(pagesDirs, extensions))
        .filter(page => !page.path.includes(':'))
        .filter(page => urlFilter(page.path))
        .map((page) => {
          const entry = <SitemapFullEntry> {
            loc: page.path,
          }
          if (autoLastmod)
            entry.lastmod = statSync(page.file as string).ctime
          return entry
        })
    : []

  // we'll do a $fetch of the sitemap
  let lazyApiUrls: string[] = []
  // only if we have the actual route setup
  if (hasApiRoutesUrl) {
    try {
      lazyApiUrls = await $fetch('/api/_sitemap-urls')
    }
    catch {
    }
  }

  let nuxtContentUrls: string[] = []
  if (isNuxtContentDocumentDriven) {
    try {
      nuxtContentUrls = await $fetch('/api/__sitemap__/document-driven-urls')
    }
    catch {
    }
  }

  const urls = [
    ...lazyApiUrls,
    ...configUrls,
    ...pageUrls,
    ...nuxtContentUrls,
  ]

  return uniqueBy(preNormalise(urls)
    .map((entry) => {
      // route matcher assumes all routes have no trailing slash
      const routeRules = options.getRouteRulesForPath(withoutTrailingSlash(entry.loc))
      if (routeRules.index === false)
        return false
      return defu(routeRules.sitemap, entry)
    })
    .filter(Boolean)
    // sets the route to the full path
    .map(postNormalise), 'loc') as ResolvedSitemapEntry[]
}
