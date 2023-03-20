import { statSync } from 'node:fs'
import { withBase, withTrailingSlash, withoutTrailingSlash } from 'ufo'
import { defu } from 'defu'
import type { ResolvedSitemapEntry, SitemapEntry, SitemapFullEntry } from '../../types'
import { createFilter } from './urlFilter'
import { mergeOnKey, resolvePagesRoutes } from './pageUtils'
import { normaliseDate } from './normalise'
import type { BuildSitemapOptions } from './builder'

export async function generateSitemapEntries(options: BuildSitemapOptions) {
  const {
    urls: configUrls,
    defaults, exclude,
    isNuxtContentDocumentDriven,
    include, trailingSlash, inferStaticPagesAsRoutes, hasApiRoutesUrl, autoLastmod, siteUrl,
  } = options.sitemapConfig
  const urlFilter = createFilter({ include, exclude })

  const defaultEntryData = { ...defaults }
  if (autoLastmod)
    defaultEntryData.lastmod = defaultEntryData.lastmod || new Date()

  const fixLoc = (url: string) => withBase(encodeURI(trailingSlash ? withTrailingSlash(url) : withoutTrailingSlash(url)), options.baseURL)

  function preNormalise(entries: SitemapEntry[]) {
    return (mergeOnKey(
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

  let pageUrls: SitemapEntry[] = []
  if (process.dev || process.env.prerender) {
    // not accessible on build but needed for prerender
    if (options.sitemapConfig.pagesDirs && options.sitemapConfig.extensions) {
      const { pagesDirs, extensions } = options.sitemapConfig
      pageUrls = inferStaticPagesAsRoutes
        ? (await resolvePagesRoutes(pagesDirs, extensions))
            .map((page) => {
              const entry = <SitemapFullEntry>{ loc: page.path }
              if (autoLastmod && page.file) {
                const stats = statSync(page.file)
                entry.lastmod = stats.mtime || stats.ctime
              }
              return entry
            })
        : []
    }
  }

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
    '/',
    ...lazyApiUrls,
    ...configUrls,
    ...pageUrls,
    ...nuxtContentUrls,
  ]

  return mergeOnKey(
    preNormalise(urls)
      .map((entry) => {
        // route matcher assumes all routes have no trailing slash
        const routeRules = options.getRouteRulesForPath(withoutTrailingSlash(entry.loc))
        if (routeRules.index === false)
          return false
        return defu(routeRules.sitemap, entry)
      })
      .filter(Boolean)
      // sets the route to the full path
      .map(postNormalise),
    'loc',
  ) as ResolvedSitemapEntry[]
}
