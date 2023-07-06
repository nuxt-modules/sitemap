import { statSync } from 'node:fs'
import type { NuxtPage } from 'nuxt/schema'
import { joinURL } from 'ufo'
import type { SitemapEntry } from './runtime/types'

export function convertNuxtPagesToSitemapEntries(pages: NuxtPage[], config: { routeNameSeperator?: string; autoLastmod: boolean; defaultLocale: string }) {
  config.routeNameSeperator = config.routeNameSeperator || '__'
  const flattenedPages = pages
    .map((page) => {
      return page.children?.length
        ? page.children.map((child) => {
          return {
            loc: joinURL(page.path, child.path),
            page: child,
          }
        })
        : { page, loc: page.path }
    })
    .flat()
    .filter(p => !p.loc.includes(':'))

  const pagesWithMeta = flattenedPages.map((p) => {
    if (config.autoLastmod && p.page.file) {
      const stats = statSync(p.page.file)
      p.lastmod = stats.mtime
    }
    return p
  })

  const localeGropes = {}
  pagesWithMeta.reduce((acc, entry) => {
    if (config.routeNameSeperator) {
      let [name, locale] = entry.page.name.split(config.routeNameSeperator)
      locale = locale.slice(1)
      if (!acc[name])
        acc[name] = []
      acc[name].push({ ...entry, locale })
    }
    else {
      acc.default = acc.default || []
      acc.default.push(entry)
    }

    return acc
  }, localeGropes)

  // now need to convert to alternativs
  const final: SitemapEntry[] = Object.entries(localeGropes).map(([_, entries]) => {
    // need to take defaultLocale into account, only add alternatives for non-default
    const alternatives = entries.map((entry) => {
      if (entry.locale === config.defaultLocale)
        return null
      return {
        hreflang: entry.locale,
        href: entry.loc,
      }
    }).filter(Boolean)

    const defaultEntry = entries.find(entry => entry.locale === config.defaultLocale)
    delete defaultEntry.page
    delete defaultEntry.locale
    return {
      alternatives,
      ...defaultEntry,
    }
  })

  return final
}
