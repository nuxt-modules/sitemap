import { ref } from 'vue'
import type { ModuleRuntimeConfig, SitemapDefinition, SitemapSourceResolved } from '../../src/runtime/types'
import { appFetch } from './rpc'

export const data = ref<{
  nitroOrigin: string
  globalSources: SitemapSourceResolved[]
  sitemaps: SitemapDefinition[]
  runtimeConfig: ModuleRuntimeConfig
} | null>(null)

export async function refreshSources() {
  if (appFetch.value)
    data.value = await appFetch.value('/__sitemap__/debug.json')
}
