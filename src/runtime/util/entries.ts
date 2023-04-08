import { statSync } from 'node:fs'
import {withBase, withTrailingSlash, withoutTrailingSlash, joinURL} from 'ufo'
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
    hasPrerenderedRoutesPayload,
    autoAlternativeLangPrefixes,
  } = options.sitemapConfig
  // make sure include and exclude start with baseURL
  const baseURL = options.baseURL
  const includeWithBase = include?.map(i => withBase(i, baseURL))
  const excludeWithBase = exclude?.map(i => withBase(i, baseURL))
  const urlFilter = createFilter({ include: includeWithBase, exclude: excludeWithBase })

  const defaultEntryData = { ...defaults }
  if (autoLastmod)
    defaultEntryData.lastmod = defaultEntryData.lastmod || new Date()

  const fixLoc = (url: string) => {
    url = encodeURI(trailingSlash ? withTrailingSlash(url) : withoutTrailingSlash(url))
    return url.startsWith(baseURL) ? url : withBase(url, baseURL)
  }

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
        // make sure it's valid
        if (!e.lastmod)
          delete e.lastmod

        if (Array.isArray(autoAlternativeLangPrefixes)) {
          // check the route doesn't start with a prefix
          if (autoAlternativeLangPrefixes.some((prefix) => {
            return e.loc!.startsWith(withBase(`/${prefix}`, options.baseURL))
          }))
            return false
          const loc = e.loc?.replace(options.baseURL, '') || ''
          // otherwise add the entries
          e.alternatives = autoAlternativeLangPrefixes.map(prefix => ({
            hreflang: prefix,
            href: fixLoc(joinURL(prefix, loc)),
          }))
        }
        return e
      })
      .filter(Boolean)
  }
  function postNormalise(e: ResolvedSitemapEntry) {
    // need to make sure siteURL doesn't have the base on the ned
    const siteUrlWithoutBase = siteUrl.replace(new RegExp(`${baseURL}$`), '')
    e.loc = withBase(e.loc, siteUrlWithoutBase)
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
                entry.lastmod = stats.mtime
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
      lazyApiUrls = await $fetch(withBase('/api/_sitemap-urls', options.baseURL))
    }
    catch {
    }
  }

  // for SSR we inject a payload of the routes which we can later read from
  let prerenderedRoutesPayload: string[] = []
  if (hasPrerenderedRoutesPayload) {
    try {
      prerenderedRoutesPayload = await $fetch(withBase('/__sitemap__/routes.json', options.baseURL))
    }
    catch {
    }
  }

  let nuxtContentUrls: string[] = []
  if (isNuxtContentDocumentDriven) {
    try {
      nuxtContentUrls = await $fetch(withBase('/api/__sitemap__/document-driven-urls', options.baseURL))
    }
    catch {
    }
  }

  const urls = [
    '/',
    ...prerenderedRoutesPayload,
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
