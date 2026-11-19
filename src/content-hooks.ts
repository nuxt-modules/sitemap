import type { PageCollectionItemBase } from '@nuxt/content'

declare global {
  // eslint-disable-next-line vars-on-top
  var __sitemapCollectionFilters: Map<string, (entry: any) => boolean> | undefined
  // eslint-disable-next-line vars-on-top
  var __sitemapCollectionOnUrlFns: Map<string, (url: any, entry: any, collection: string) => void> | undefined
}

export interface SitemapCollectionHooks<TEntry, TFields> {
  name?: string
  filter?: (entry: PageCollectionItemBase & TFields & TEntry) => boolean
  onUrl?: (
    url: { loc: string, lastmod?: string | Date, changefreq?: string, priority?: number, images?: { loc: string }[], videos?: { content_loc: string }[], [key: string]: unknown },
    entry: PageCollectionItemBase & TFields & TEntry,
    collection: string,
  ) => void
}

export function registerCollectionHooks<TEntry, TFields>(options: SitemapCollectionHooks<TEntry, TFields> | undefined, callerName: string) {
  if (!options?.filter && !options?.onUrl)
    return
  if (!options.name)
    throw new Error(`[sitemap] \`name\` is required when using \`filter\` or \`onUrl\` in ${callerName}()`)
  if (options.filter)
    (globalThis.__sitemapCollectionFilters ??= new Map()).set(options.name, options.filter)
  if (options.onUrl)
    (globalThis.__sitemapCollectionOnUrlFns ??= new Map()).set(options.name, options.onUrl)
}
