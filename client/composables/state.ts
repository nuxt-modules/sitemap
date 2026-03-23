import type { ModuleRuntimeConfig, SitemapDefinition, SitemapSourceResolved } from '../../src/runtime/types'
import { ref, watch } from 'vue'

export const data = ref<{
  nitroOrigin: string
  globalSources: SitemapSourceResolved[]
  sitemaps: SitemapDefinition[]
  runtimeConfig: ModuleRuntimeConfig
  siteConfig?: { url?: string }
} | null>(null)

export async function refreshSources() {
  if (appFetch.value)
    data.value = await appFetch.value('/__sitemap__/debug.json')
}

// Sync production URL from siteConfig when debug data loads
watch(data, (val) => {
  if (val?.siteConfig?.url)
    productionUrl.value = val.siteConfig.url
}, { immediate: true })
