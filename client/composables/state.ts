import type { ProductionDebugResponse } from '../../src/runtime/server/routes/__sitemap__/debug-production'
import type { ModuleRuntimeConfig, SitemapDefinition, SitemapSourceResolved } from '../../src/runtime/types'
import { ref, watch } from 'vue'

export const data = ref<{
  nitroOrigin: string
  globalSources: SitemapSourceResolved[]
  sitemaps: SitemapDefinition[]
  runtimeConfig: ModuleRuntimeConfig
  siteConfig?: { url?: string }
} | null>(null)

// Production debug data from the remote /__sitemap__/debug.json (requires debug: true in production)
export const productionRemoteDebugData = ref<typeof data.value | null>(null)

export const productionData = ref<ProductionDebugResponse | null>(null)
export const productionLoading = ref(false)

export async function refreshSources() {
  if (appFetch.value)
    data.value = await appFetch.value('/__sitemap__/debug.json')
}

export async function refreshProductionData() {
  if (!appFetch.value || !productionUrl.value)
    return
  productionLoading.value = true
  productionRemoteDebugData.value = null

  // Try fetching the full debug endpoint from production first (proxied through local server)
  const remoteDebug = await appFetch.value('/__sitemap__/debug-production.json', {
    query: { url: productionUrl.value, mode: 'debug' },
  }).catch(() => null)
  if (remoteDebug && !remoteDebug.error && remoteDebug.sitemaps && !Array.isArray(remoteDebug.sitemaps)) {
    // Response has object sitemaps (debug.json format) rather than array (XML fallback format)
    productionRemoteDebugData.value = remoteDebug
    productionLoading.value = false
    return
  }

  // Fall back to XML-based validation
  productionData.value = await appFetch.value('/__sitemap__/debug-production.json', {
    query: { url: productionUrl.value },
  }).catch((err: Error) => {
    console.error('Failed to fetch production sitemap data:', err)
    return null
  })
  productionLoading.value = false
}

// Sync production URL from siteConfig when debug data loads
watch(data, (val) => {
  if (val?.siteConfig?.url)
    productionUrl.value = val.siteConfig.url
}, { immediate: true })

// Fetch production data when switching to production mode
watch(isProductionMode, (isProd) => {
  if (isProd && !productionData.value && !productionRemoteDebugData.value)
    refreshProductionData()
})
