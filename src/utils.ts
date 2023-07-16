import { statSync } from 'node:fs'
import type { NuxtPage } from 'nuxt/schema'
import { joinURL } from 'ufo'
import type { SitemapEntryInput } from './runtime/types'

export interface NuxtPagesToSitemapEntriesOptions {
  routeNameSeperator?: string
  autoLastmod: boolean
  defaultLocale: string
  strategy: 'no_prefix' | 'prefix_except_default' | 'prefix' | 'prefix_and_default'
}

export function convertNuxtPagesToSitemapEntries(pages: NuxtPage[], config: NuxtPagesToSitemapEntriesOptions) {
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
      try {
        const stats = statSync(p.page.file)
        if (stats)
          p.lastmod = stats.mtime
      }
      catch (e) {}
    }
    return p
  })

  const localeGropes = {}
  pagesWithMeta.reduce((acc, entry) => {
    if (entry.page.name.includes(config.routeNameSeperator)) {
      let [name, locale] = entry.page.name.split(config.routeNameSeperator)
      if (locale)
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
  const final: SitemapEntryInput[] = Object.entries(localeGropes).map(([locale, entries]) => {
    if (locale === 'default') {
      // routes must have a locale if we're prefixing them
      if (config.strategy === 'prefix')
        return []
      return entries.map((e) => {
        delete e.page
        delete e.locale
        return e
      })
    }
    // need to take defaultLocale into account, only add alternatives for non-default
    const alternatives = entries.map((entry) => {
      if (!entry.locale || entry.locale === config.defaultLocale)
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
  }).flat()

  return final
}
