<script setup lang="ts">
import { loadShiki } from 'nuxtseo-layer-devtools/composables/shiki'
import { isProductionMode } from 'nuxtseo-layer-devtools/composables/state'
import { computed, ref, watch } from 'vue'
import { navigateTo, useRoute } from '#imports'
import { data, productionData, productionRemoteDebugData, refreshProductionData, refreshSources } from '../lib/sitemap/state'
import '../lib/sitemap/rpc'

await loadShiki()

const refreshing = ref(false)

async function refresh() {
  if (refreshing.value)
    return
  refreshing.value = true
  data.value = null
  productionData.value = null
  productionRemoteDebugData.value = null
  await refreshSources()
  if (isProductionMode.value)
    await refreshProductionData()
  setTimeout(() => {
    refreshing.value = false
  }, 300)
}

const route = useRoute()
const currentTab = computed(() => {
  const path = route.path
  if (path.startsWith('/sitemap/user-sources'))
    return 'user-sources'
  if (path.startsWith('/sitemap/app-sources'))
    return 'app-sources'
  if (path.startsWith('/sitemap/debug'))
    return 'debug'
  if (path.startsWith('/sitemap/docs'))
    return 'docs'
  return 'sitemaps'
})

const navItems = [
  { value: 'sitemaps', to: '/sitemap', icon: 'carbon:load-balancer-application', label: 'Sitemaps', devOnly: false },
  { value: 'user-sources', to: '/sitemap/user-sources', icon: 'carbon:group-account', label: 'User Sources', devOnly: true },
  { value: 'app-sources', to: '/sitemap/app-sources', icon: 'carbon:bot', label: 'App Sources', devOnly: true },
  { value: 'debug', to: '/sitemap/debug', icon: 'carbon:debug', label: 'Debug', devOnly: true },
  { value: 'docs', to: '/sitemap/docs', icon: 'carbon:book', label: 'Docs', devOnly: false },
]

const runtimeVersion = computed(() => data.value?.runtimeConfig?.version)

watch(isProductionMode, (isProd) => {
  if (isProd && ['user-sources', 'app-sources', 'debug'].includes(currentTab.value))
    return navigateTo('/sitemap')
})
</script>

<template>
  <DevtoolsLayout
    v-model:active-tab="currentTab"
    module-name="sitemap"
    title="Sitemap"
    icon="carbon:load-balancer-application"
    :version="runtimeVersion"
    :nav-items="navItems"
    github-url="https://github.com/nuxt-modules/sitemap"
    :loading="!data?.globalSources || refreshing"
    @refresh="refresh"
  >
    <NuxtPage />
  </DevtoolsLayout>
</template>
