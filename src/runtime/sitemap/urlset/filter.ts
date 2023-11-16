import { parseURL } from 'ufo'
import { createRouter, toRouteMatcher } from 'radix3'
import type { ModuleRuntimeConfig, ResolvedSitemapUrl, SitemapDefinition } from '../../types'

interface CreateFilterOptions {
  include?: (string | RegExp)[]
  exclude?: (string | RegExp)[]
}

function createFilter(options: CreateFilterOptions = {}): (path: string) => boolean {
  const include = options.include || []
  const exclude = options.exclude || []
  if (include.length === 0 && exclude.length === 0)
    return () => true

  return function (path: string): boolean {
    for (const v of [{ rules: exclude, result: false }, { rules: include, result: true }]) {
      const regexRules = v.rules.filter(r => r instanceof RegExp) as RegExp[]
      if (regexRules.some(r => r.test(path)))
        return v.result

      const stringRules = v.rules.filter(r => typeof r === 'string') as string[]
      if (stringRules.length > 0) {
        const routes = {}
        for (const r of stringRules) {
          // quick scan of literal string matches
          if (r === path)
            return v.result

          // need to flip the array data for radix3 format, true value is arbitrary
          // @ts-expect-error untyped
          routes[r] = true
        }
        const routeRulesMatcher = toRouteMatcher(createRouter({ routes, strictTrailingSlash: false }))
        if (routeRulesMatcher.matchAll(path).length > 0)
          return Boolean(v.result)
      }
    }
    return include.length === 0
  }
}

export function filterSitemapUrls(_urls: ResolvedSitemapUrl[], options: Pick<ModuleRuntimeConfig, 'autoI18n' | 'isMultiSitemap'> & Pick<SitemapDefinition, 'sitemapName' | 'include' | 'exclude'>) {
  // base may be wrong here
  const urlFilter = createFilter(options)
  return _urls.filter((e) => {
    let path = e.loc
    try {
      // e.loc is absolute here
      path = parseURL(e.loc).pathname
    }
    catch {
      // invalid URL
      return false
    }
    if (!urlFilter(path))
      return false

    if (options.isMultiSitemap && e._sitemap && options.sitemapName)
      return e._sitemap === options.sitemapName
    return true
  })
}
