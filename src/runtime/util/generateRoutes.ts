import { statSync } from 'node:fs'
import { withBase, withTrailingSlash, withoutTrailingSlash } from 'ufo'
import { resolvePagesRoutes, uniqueBy } from '../../page-utils'
import { createFilter } from '../../urlFilter'
import type { ModuleOptions, SitemapEntry } from '../../module'

export async function generateRoutes(
  { urls: configUrls, defaults, exclude, extensions, include, pagesDirs, trailingSlash, inferStaticPagesAsRoutes }: ModuleOptions,
  baseURL: string,
  getRouteRulesForPath: (path: string) => Record<string, any>,
) {
  const urlFilter = createFilter({ include, exclude })

  // @todo if auto last mod
  defaults.lastmod = defaults.lastmod || new Date().toISOString()

  const fixUrl = (url: string) => withBase(encodeURI(trailingSlash ? withTrailingSlash(url) : withoutTrailingSlash(url)), baseURL)

  function normaliseUrls(urls: (string | SitemapEntry)[]): SitemapEntry[] {
    return uniqueBy(
      urls
        .map(url => typeof url === 'string' ? { url } : url)
        .map(url => ({ ...defaults, ...url }))
        .map(url => ({ ...url, url: fixUrl(url.url) })),
      'url',
    )
      .filter(url => urlFilter(url.url))
      .sort((a, b) => a.url.length - b.url.length)
  }
  const pages = inferStaticPagesAsRoutes
    ? (await resolvePagesRoutes(pagesDirs, extensions))
        .filter(page => !page.path.includes(':'))
        .filter(page => urlFilter(page.path))
        .map((page) => {
          return {
            url: page.path,
            lastmod: statSync(page.file).ctime.toISOString(),
          }
        })
    : []

  // we'll do a $fetch of the sitemap
  // @todo validate this route exists first
  let lazyUrls: string[] = []
  try {
    lazyUrls = await $fetch('/api/_sitemap/urls')
  }
  catch {}

  return normaliseUrls([
    ...lazyUrls,
    ...configUrls,
    ...pages,
  ])
    .map((entry) => {
      // route matcher assumes all routes have no trailing slash
      const routeRules = getRouteRulesForPath(withoutTrailingSlash(entry.url))
      if (routeRules.index === false)
        return false
      return { ...entry, ...(routeRules.sitemap || {}) }
    })
    .filter(Boolean)
}
