import { statSync } from 'node:fs'
import type { NuxtModule, NuxtPage } from 'nuxt/schema'
import { joinURL } from 'ufo'
import type { Nuxt } from '@nuxt/schema'
import { loadNuxtModuleInstance, normalizeSemanticVersion, useNuxt } from '@nuxt/kit'
import { satisfies } from 'semver'
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

  // now need to convert to alternatives
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
    // there may not be a default entry?
    if (!defaultEntry)
      return null
    delete defaultEntry.page
    delete defaultEntry.locale
    return {
      alternatives,
      ...defaultEntry,
    }
  }).filter(Boolean).flat()

  return final
}

/**
 * Get the user provided options for a Nuxt module.
 *
 * These options may not be the resolved options that the module actually uses.
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

/**
 * Check if a Nuxt module is installed by name.
 *
 * This will check both the installed modules and the modules to be installed. Note
 * that it cannot detect if a module is _going to be_ installed programmatically by another module.
 */
export function hasNuxtModule(moduleName: string, nuxt: Nuxt = useNuxt()): boolean {
  // check installed modules
  return nuxt.options._installedModules.some(({ meta }) => meta.name === moduleName)
    // check modules to be installed
    || Boolean(
      nuxt.options.modules
        .find((m) => {
          // input may either a string, an array or a module instance
          function resolveModuleEntry(input: typeof m): boolean {
            if (typeof input === 'object' && !Array.isArray(input))
              return (input as any as NuxtModule).name === moduleName
            return Array.isArray(input) ? resolveModuleEntry(input[0]) : input === moduleName
          }
          return resolveModuleEntry(m)
        }),
    )
}

/**
 * Get the version of a Nuxt module.
 *
 * Scans installed modules for the version, if it's not found it will attempt to load the module instance and get the version from there.
 */
export async function getNuxtModuleVersion(module: string | NuxtModule, nuxt: Nuxt | any = useNuxt()): Promise<string | false> {
  const moduleMeta = (typeof module === 'string' ? { name: module } : await module.getMeta?.()) || {}
  if (moduleMeta.version)
    return moduleMeta.version
  // need a name from here
  if (!moduleMeta.name)
    return false
  // maybe the version got attached within the installed module instance?
  const version = nuxt.options._installedModules
    // @ts-expect-error _installedModules is not typed
    .filter(m => m.meta.name === moduleMeta.name).map(m => m.meta.version)?.[0]
  if (version)
    return version

  // it's possible that the module will be installed, it just hasn't been done yet, preemptively load the instance
  if (hasNuxtModule(moduleMeta.name)) {
    const { buildTimeModuleMeta } = await loadNuxtModuleInstance(moduleMeta.name, nuxt)
    return buildTimeModuleMeta.version || false
  }
  return false
}

/**
 * Checks if a Nuxt Module is compatible with a given semver version.
 */
export async function hasNuxtModuleCompatibility(module: string | NuxtModule, semverVersion: string, nuxt: Nuxt = useNuxt()): Promise<boolean> {
  const version = await getNuxtModuleVersion(module, nuxt)
  if (!version)
    return false

  return satisfies(normalizeSemanticVersion(version), semverVersion, {
    includePrerelease: true,
  })
}

export function generateExtraRoutesFromNuxtConfig(nuxt: Nuxt = useNuxt()) {
  const routeRules = Object.entries(nuxt.options.routeRules || {})
    .filter(([k, v]) => {
      // make sure key doesn't use a wildcard and its not for a file
      if (k.includes('*') || k.includes('.'))
        return false
      if (typeof v.index === 'boolean' && !v.index)
        return false
      // make sure that we're not redirecting
      return !v.redirect
    })
    .map(([k]) => k)
  // don't support files
  const prerenderUrls = (nuxt.options.nitro.prerender?.routes || [])
    .filter(p => p && !p.includes('.') && !p.startsWith('/api/')) as string[]
  return { routeRules, prerenderUrls }
}
