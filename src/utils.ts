import { statSync } from 'node:fs'
import type { NuxtModule, NuxtPage } from 'nuxt/schema'
import type { Nuxt } from '@nuxt/schema'
import { loadNuxtModuleInstance, useNuxt } from '@nuxt/kit'
import { extname } from 'pathe'
import type { SitemapEntryInput } from './runtime/types'

export interface NuxtPagesToSitemapEntriesOptions {
  normalisedLocales: { code: string; iso?: string }[]
  routeNameSeperator?: string
  autoLastmod: boolean
  defaultLocale: string
  strategy: 'no_prefix' | 'prefix_except_default' | 'prefix' | 'prefix_and_default'
}
function deepForEachPage(
  pages: NuxtPage[],
  callback: Function,
  fullpath: string | undefined | null = null,
  depth: number = 0,
) {
  pages.map((page: NuxtPage) => {
    let currentPath = ''
    if (fullpath == null)
      currentPath = ''
    if (page.path.startsWith('/'))
      currentPath = page.path
    else
      currentPath = page.path === '' ? fullpath : `${fullpath.replace(/\/$/, '')}/${page.path}`
    callback(page, currentPath, depth)
    if (page.children)
      deepForEachPage(page.children, callback, currentPath, depth + 1)
  })
}

export function convertNuxtPagesToSitemapEntries(pages: NuxtPage[], config: NuxtPagesToSitemapEntriesOptions) {
  const routeNameSeperator = config.routeNameSeperator || '___'

  let flattenedPages = []
  deepForEachPage(
    pages,
    (page, fullpath, depth) => {
      flattenedPages.push({
        page,
        loc: fullpath,
        depth,
      })
    },
  )
  flattenedPages = flattenedPages
    // Removing dynamic routes
    .filter(page => !page.loc.includes(':'))
    // Removing duplicates
    .filter((page, idx, arr) => {
      return !arr.find((p) => {
        return p.loc === page.loc && p.depth > page.depth
      })
    })
    .map((p) => {
      delete p.depth
      return p
    })

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
  const localeGroups = {}
  pagesWithMeta.reduce((acc: Record<string, any>, entry) => {
    if (entry.page.name?.includes(routeNameSeperator)) {
      const [name, locale] = entry.page.name.split(routeNameSeperator)
      if (!acc[name])
        acc[name] = []
      acc[name].push({ ...entry, locale })
    }
    else {
      acc.default = acc.default || []
      acc.default.push(entry)
    }

    return acc
  }, localeGroups)

  // now need to convert to alternatives
  const final: SitemapEntryInput[] = Object.entries(localeGroups).map(([locale, entries]) => {
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

    return entries.map((entry) => {
      const alternatives = entries.map((entry) => {
        // check if the locale has a iso code
        const hreflang = config.normalisedLocales.find(l => l.code === entry.locale)?.iso || entry.locale
        return {
          hreflang,
          href: entry.loc,
        }
      })
      const xDefault = entries.find(a => a.locale === config.defaultLocale)
      if (xDefault) {
        alternatives.push({
          hreflang: 'x-default',
          href: xDefault.loc,
        })
      }
      const e = { ...entry }
      delete e.page
      delete e.locale
      return {
        ...e,
        alternatives,
      }
    })
  })
    .filter(Boolean)
    .flat()

  return final
}

/**
 * Get the user provided options for a Nuxt module.
 *
 * These options may not be the resolved options that the module actually uses.
 * @param module
 * @param nuxt
 */
export async function getNuxtModuleOptions(module: string | NuxtModule, nuxt: Nuxt = useNuxt()) {
  const moduleMeta = (typeof module === 'string' ? { name: module } : await module.getMeta?.()) || {}
  const { nuxtModule } = (await loadNuxtModuleInstance(module, nuxt))
  const inlineOptions = (
    await Promise.all(
      nuxt.options.modules
        .filter(async (m) => {
          if (!Array.isArray(m))
            return false
          const _module = m[0]
          return typeof module === 'object'
            ? (await (_module as any as NuxtModule).getMeta?.() === moduleMeta.name)
            : _module === moduleMeta.name
        })
        .map(m => m?.[1 as keyof typeof m]),
    )
  )[0] || {}
  if (nuxtModule.getOptions)
    return nuxtModule.getOptions(inlineOptions, nuxt)
  return inlineOptions
}

export function generateExtraRoutesFromNuxtConfig(nuxt: Nuxt = useNuxt()) {
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
  // don't support files
  const prerenderUrls = (nuxt.options.nitro.prerender?.routes || [])
    .filter(p => p && !extname(p) && !p.startsWith('/api/')) as string[]
  return { routeRules, prerenderUrls }
}
