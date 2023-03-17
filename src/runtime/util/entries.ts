import { statSync } from 'node:fs'
import { withBase, withTrailingSlash, withoutTrailingSlash } from 'ufo'
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

  const urls = [
    ...lazyApiUrls,
    ...configUrls,
    ...pageUrls,
  ]

  // create route from document driven mode
  if (useRuntimeConfig().content?.documentDriven) {
    const parsedKeys = (await useStorage().getKeys('cache:content:parsed'))
      .filter(k => k.endsWith('.md') && !k.includes('/_'))
    for (const k of parsedKeys) {
      const meta = await useStorage().getMeta(k)
      const item = await useStorage().getItem(k)
      // add any top level images
      // @ts-expect-error untyped
      const images = item?.parsed.body?.children
        ?.filter(c => c.tag.toLowerCase() === 'image')
        .map(i => ({
          loc: i.props.src,
        })) || []
      const loc = k.replace('cache:content:parsed', '')
        .replaceAll(':', '/')
        // need to strip out the leading number such as 0.index.md -> index.md
        .replace(/\/\d+\./, '/')
        .split('.')[0]
      urls.push({ loc, lastmod: meta?.mtime, images })
    }
  }

  return uniqueBy(preNormalise(urls)
    .map((entry) => {
      // route matcher assumes all routes have no trailing slash
      const routeRules = options.getRouteRulesForPath(withoutTrailingSlash(entry.loc))
      if (routeRules.index === false)
        return false
      return { ...entry, ...(routeRules.sitemap || {}) }
    })
    .filter(Boolean)
    // sets the route to the full path
    .map(postNormalise), 'loc') as ResolvedSitemapEntry[]
}
