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
    if (options.isMultiSitemap && e._sitemap && options.sitemapName)
      return e._sitemap === options.sitemapName
    try {
      const path = parseURL(e.loc).pathname
      if (!urlFilter(path))
        return false

      const { autoI18n } = options
      // if the non-prefixed locale is blocked then we block the prefixed versions
      if (autoI18n?.locales && autoI18n?.strategy !== 'no_prefix') {
        // remove the locale path from the prefix, if it exists, need to use regex
        const match = path.match(new RegExp(`^/(${autoI18n.locales.map(l => l.code).join('|')})(.*)`))
        const pathWithoutPrefix = match?.[2]
        if (pathWithoutPrefix && pathWithoutPrefix !== path) {
          if (!urlFilter(pathWithoutPrefix))
            return false
        }
      }
      return true
    }
    catch {
      // invalid URL
      return false
    }
  })
}
