<script setup lang="ts">
import { navigateTo, useRoute } from '#imports'
import { computed, ref, watch } from 'vue'
import { data, refreshSources } from './composables/state'
import './composables/rpc'

await loadShiki()

const refreshing = ref(false)

async function refresh() {
  if (refreshing.value)
    return
  refreshing.value = true
  data.value = null
  await refreshSources()
  setTimeout(() => {
    refreshing.value = false
  }, 300)
}

const route = useRoute()
const currentTab = computed(() => {
  const path = route.path
  if (path.startsWith('/user-sources'))
    return 'user-sources'
  if (path.startsWith('/app-sources'))
    return 'app-sources'
  if (path.startsWith('/debug'))
    return 'debug'
  if (path.startsWith('/docs'))
    return 'docs'
  return 'sitemaps'
})

const navItems = [
  { value: 'sitemaps', to: '/', icon: 'carbon:load-balancer-application', label: 'Sitemaps', devOnly: false },
  { value: 'user-sources', to: '/user-sources', icon: 'carbon:group-account', label: 'User Sources', devOnly: true },
  { value: 'app-sources', to: '/app-sources', icon: 'carbon:bot', label: 'App Sources', devOnly: true },
  { value: 'debug', to: '/debug', icon: 'carbon:debug', label: 'Debug', devOnly: true },
  { value: 'docs', to: '/docs', icon: 'carbon:book', label: 'Docs', devOnly: false },
]

const runtimeVersion = computed(() => data.value?.runtimeConfig?.version || 'unknown')

// Redirect to home when switching to production mode from a dev-only tab
watch(isProductionMode, (isProd) => {
  if (isProd && ['user-sources', 'app-sources', 'debug'].includes(currentTab.value))
    navigateTo('/')
})
</script>

<template>
  <DevtoolsLayout
    v-model:active-tab="currentTab"
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

<style>
/* Textarea */
textarea {
  background: var(--color-surface-sunken);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

textarea:focus-visible {
  border-color: var(--seo-green);
  outline: none;
}

/* JSON Editor theme */
:root {
  --jse-theme-color: var(--color-surface-elevated) !important;
  --jse-text-color-inverse: var(--color-text-muted) !important;
  --jse-theme-color-highlight: var(--color-surface-sunken) !important;
  --jse-panel-background: var(--color-surface-elevated) !important;
  --jse-background-color: var(--jse-panel-background) !important;
  --jse-error-color: oklch(65% 0.2 25 / 0.3) !important;
  --jse-main-border: none !important;
}

.dark,
.jse-theme-dark {
  --jse-panel-background: var(--color-neutral-900) !important;
  --jse-theme-color: var(--color-neutral-900) !important;
  --jse-text-color-inverse: var(--color-neutral-300) !important;
  --jse-main-border: none !important;
}

.jse-main {
  min-height: 1em !important;
}

.jse-contents {
  border-width: 0 !important;
  border-radius: var(--radius-md) !important;
}
</style>
