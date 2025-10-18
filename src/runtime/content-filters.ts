// use global to persist across module boundaries during build
declare global {
  // eslint-disable-next-line no-var
  var __sitemapBuildTimeFilters: Map<string, (entry: any) => boolean> | undefined
}

if (!globalThis.__sitemapBuildTimeFilters)
  globalThis.__sitemapBuildTimeFilters = new Map()

export const _collectionFilters = globalThis.__sitemapBuildTimeFilters
