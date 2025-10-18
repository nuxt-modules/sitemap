import { defineNitroPlugin } from 'nitropack/runtime'
// @ts-expect-error virtual module
import { filters } from '#sitemap/content-filters'

// Make filters globally accessible in Nitro runtime
declare global {
  // eslint-disable-next-line no-var
  var __sitemapContentFilters: Map<string, (entry: any) => boolean>
}

export default defineNitroPlugin(() => {
  globalThis.__sitemapContentFilters = filters
})
