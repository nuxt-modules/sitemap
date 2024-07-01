import { statSync } from 'node:fs'
import type { NuxtPage } from 'nuxt/schema'
import type { Nuxt } from '@nuxt/schema'
import { useNuxt } from '@nuxt/kit'
import { extname } from 'pathe'
import { defu } from 'defu'
import type { ConsolaInstance } from 'consola'
import type { SitemapDefinition, SitemapUrl, SitemapUrlInput } from '../runtime/types'
import { createPathFilter } from '../runtime/utils-pure'
import type { CreateFilterOptions } from '../runtime/utils-pure'

export async function resolveUrls(urls: Required<SitemapDefinition>['urls'], ctx: { logger: ConsolaInstance, path: string }): Promise<SitemapUrlInput[]> {
  if (typeof urls === 'function')
    urls = urls()
  // resolve promise
  urls = await urls
  // we need to validate that the urls can be serialised properly for example to avoid circular references
  try {
    urls = JSON.parse(JSON.stringify(urls))
  }
  catch (e) {
    ctx.logger.warn(`Failed to serialize ${typeof urls} \`${ctx.path}\`, please make sure that the urls resolve as a valid array without circular dependencies.`)
    ctx.logger.error(e)
    return []
  }
  return urls
}

export interface NuxtPagesToSitemapEntriesOptions {
  normalisedLocales: { code: string, iso?: string }[]
  routesNameSeparator?: string
  autoLastmod: boolean
  defaultLocale: string
  strategy: 'no_prefix' | 'prefix_except_default' | 'prefix' | 'prefix_and_default'
  isI18nMapped: boolean
  filter: CreateFilterOptions
}

interface PageEntry extends SitemapUrl {
  page?: NuxtPage
  locale?: string
  depth?: number
}

function deepForEachPage(
  pages: NuxtPage[],
  callback: (page: NuxtPage, fullpath: string, depth: number) => void,
  fullpath: string | undefined | null = null,
  depth: number = 0,
) {
  pages.forEach((page: NuxtPage) => {
    let currentPath: string | null
    if (page.path.startsWith('/'))
      currentPath = page.path
    else
      currentPath = page.path === '' ? fullpath : `${fullpath!.replace(/\/$/, '')}/${page.path}`
    callback(page, currentPath || '', depth)
    if (page.children)
      deepForEachPage(page.children, callback, currentPath, depth + 1)
  })
}

export function convertNuxtPagesToSitemapEntries(pages: NuxtPage[], config: NuxtPagesToSitemapEntriesOptions) {
  const pathFilter = createPathFilter(config.filter)
  const routesNameSeparator = config.routesNameSeparator || '___'
  let flattenedPages: PageEntry[] = []
  deepForEachPage(
    pages,
    (page, loc, depth) => {
      flattenedPages.push({ page, loc, depth })
    },
  )
  flattenedPages = flattenedPages
    // Removing dynamic routes
    .filter(page => !page.loc.includes(':'))
    // Removing duplicates
    .filter((page, idx, arr) => {
      return !arr.find((p) => {
        return p.loc === page.loc && p.depth! > page.depth!
      })
    })
    .map((p) => {
      delete p.depth
      return p
    })

  const pagesWithMeta = flattenedPages.map((p) => {
    if (config.autoLastmod && p.page!.file) {
      try {
        const stats = statSync(p.page!.file)
        if (stats?.mtime)
          p.lastmod = stats.mtime
      }
      // eslint-disable-next-line no-empty
      catch (e) {}
    }
    if (p.page?.meta?.sitemap) {
      // merge in page meta
      p = defu(p.page.meta.sitemap, p)
    }
    return p
  })
  const localeGroups: Record<string, PageEntry[]> = {}
  pagesWithMeta.reduce((acc: Record<string, any>, e) => {
    if (e.page!.name?.includes(routesNameSeparator)) {
      const [name, locale] = e.page!.name.split(routesNameSeparator)
      if (!acc[name])
        acc[name] = []
      const { iso, code } = config.normalisedLocales.find(l => l.code === locale) || { iso: locale, code: locale }
      acc[name].push({ ...e, _sitemap: config.isI18nMapped ? (iso || code) : undefined, locale })
    }
    else {
      acc.default = acc.default || []
      acc.default.push(e)
    }

    return acc
  }, localeGroups)

  // now need to convert to alternatives
  return Object.entries(localeGroups).map(([locale, entries]) => {
    if (locale === 'default') {
      // we add pages without a prefix, they may have disabled i18n
      return entries.map((e) => {
        const [name] = (e.page?.name || '').split(routesNameSeparator)
        // we need to check if the same page with a prefix exists within the default locale
        // for example this will fix the `/` if the configuration is set to `prefix`
        if (localeGroups[name]?.some(a => a.locale === config.defaultLocale))
          return false
        const defaultLocale = config.normalisedLocales.find(l => l.code === config.defaultLocale)
        if (defaultLocale && config.isI18nMapped)
          e._sitemap = defaultLocale.iso || defaultLocale.code
        delete e.page
        delete e.locale
        return { ...e }
      }).filter(Boolean)
    }
    return entries.map((entry) => {
      const alternatives = entries.map((entry) => {
        // check if the locale has a iso code
        const hreflang = config.normalisedLocales.find(l => l.code === entry.locale)?.iso || entry.locale
        if (!pathFilter(entry.loc))
          return false
        return {
          hreflang,
          href: entry.loc,
        }
      }).filter(Boolean)
      const xDefault = entries.find(a => a.locale === config.defaultLocale)
      if (xDefault && alternatives.length && pathFilter(xDefault.loc)) {
        alternatives.push({
          hreflang: 'x-default',
          href: xDefault.loc,
        })
      }
      const e = { ...entry }
      if (config.isI18nMapped) {
        const { iso, code } = config.normalisedLocales.find(l => l.code === entry.locale) || { iso: locale, code: locale }
        e._sitemap = iso || code
      }
      delete e.page
      delete e.locale
      return {
        ...e,
        alternatives,
      }
    })
  })
    .filter(Boolean)
    // TODO fix types
    .flat() as SitemapUrlInput[]
}

export function generateExtraRoutesFromNuxtConfig(nuxt: Nuxt = useNuxt()) {
  const filterForValidPage = p => p && !extname(p) && !p.startsWith('/api/') && !p.startsWith('/_')
  const routeRules = Object.entries(nuxt.options.routeRules || {})
    .filter(([k, v]) => {
      // make sure key doesn't use a wildcard and its not for a file
      if (k.includes('*') || k.includes('.') || k.includes(':'))
        return false
      if (typeof v.index === 'boolean' && !v.index)
        return false
      // make sure that we're not redirecting
      return !v.redirect
    })
    .map(([k]) => k)
    .filter(filterForValidPage)
  // don't support files
  const prerenderUrls = (nuxt.options.nitro.prerender?.routes || [])
    .filter(filterForValidPage) as string[]
  return { routeRules, prerenderUrls }
}
