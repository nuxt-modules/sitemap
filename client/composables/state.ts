import type { ModuleRuntimeConfig, SitemapDefinition, SitemapSourceResolved } from '../../src/runtime/types'
import { useLocalStorage } from '@vueuse/core'
import { hasProtocol } from 'ufo'
import { computed, ref, watch } from 'vue'
import { appFetch } from './rpc'

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

// Production preview: lets users test sitemaps against their deployed site
export const previewSource = useLocalStorage<'local' | 'production'>('nuxt-sitemap:preview-source', 'local')
export const productionUrl = ref<string>('')

// Sync production URL from siteConfig when debug data loads
watch(data, (val) => {
  if (val?.siteConfig?.url)
    productionUrl.value = val.siteConfig.url
}, { immediate: true })

export const hasProductionUrl = computed(() => {
  const url = productionUrl.value
  if (!url || !hasProtocol(url))
    return false
  return !url.includes('localhost') && !url.includes('127.0.0.1')
})

export const isProductionMode = computed(() => previewSource.value === 'production' && hasProductionUrl.value)
