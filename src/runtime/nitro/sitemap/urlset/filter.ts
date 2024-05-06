import { parseURL } from 'ufo'
import type { H3Event } from 'h3'
import type { ModuleRuntimeConfig, ResolvedSitemapUrl } from '../../../types'
import { createFilter } from '../../../utils-pure'
import { getPathRobotConfig } from '#imports'

export function filterSitemapUrls(_urls: ResolvedSitemapUrl[], options: Pick<ModuleRuntimeConfig, 'autoI18n' | 'isMultiSitemap'> & Pick<ModuleRuntimeConfig['sitemaps'][string], 'sitemapName' | 'include' | 'exclude'> & { event: H3Event }) {
  // base may be wrong here
  const urlFilter = createFilter({
    include: options.include,
    exclude: options.exclude,
  })
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

    // blocked by nuxt-simple-robots (this is a polyfill if not installed)
    if (!getPathRobotConfig(e, { path, skipSiteIndexable: true }).indexable)
      return false

    return true
  })
}
