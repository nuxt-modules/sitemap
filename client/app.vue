<script setup lang="ts">
import { useHead, useRoute } from '#imports'
import { computed, ref } from 'vue'
import { colorMode } from './composables/rpc'
import { loadShiki } from './composables/shiki'
import { data, refreshSources } from './composables/state'

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

const isDark = computed(() => colorMode.value === 'dark')
useHead({
  title: 'Nuxt Sitemap',
  htmlAttrs: {
    class: () => isDark.value ? 'dark' : '',
  },
})

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
  { value: 'sitemaps', to: '/', icon: 'carbon:load-balancer-application', label: 'Sitemaps' },
  { value: 'user-sources', to: '/user-sources', icon: 'carbon:group-account', label: 'User Sources' },
  { value: 'app-sources', to: '/app-sources', icon: 'carbon:bot', label: 'App Sources' },
  { value: 'debug', to: '/debug', icon: 'carbon:debug', label: 'Debug' },
  { value: 'docs', to: '/docs', icon: 'carbon:book', label: 'Docs' },
]

const runtimeVersion = computed(() => data.value?.runtimeConfig?.version || 'unknown')
</script>

<template>
  <UApp>
    <div class="relative bg-base flex flex-col min-h-screen">
      <div class="gradient-bg" />

      <!-- Header -->
      <header class="header glass sticky top-0 z-50">
        <div class="header-content">
          <!-- Logo & Brand -->
          <div class="flex items-center gap-3 sm:gap-4">
            <a
              href="https://nuxtseo.com"
              target="_blank"
              class="flex items-center opacity-90 hover:opacity-100 transition-opacity"
            >
              <NuxtSeoLogo class="h-6 sm:h-7" />
            </a>

            <div class="divider" />

            <div class="flex items-center gap-2">
              <div class="brand-icon">
                <UIcon name="carbon:load-balancer-application" class="text-base sm:text-lg" />
              </div>
              <h1 class="text-sm sm:text-base font-semibold tracking-tight text-[var(--color-text)]">
                Sitemap
              </h1>
              <UBadge
                color="neutral"
                variant="subtle"
                size="xs"
                class="font-mono text-[10px] sm:text-xs hidden sm:inline-flex"
              >
                {{ runtimeVersion }}
              </UBadge>
            </div>
          </div>

          <!-- Navigation -->
          <nav class="flex items-center gap-1 sm:gap-2">
            <!-- Nav Tabs -->
            <div class="nav-tabs">
              <NuxtLink
                v-for="item of navItems"
                :key="item.value"
                :to="item.to"
                class="nav-tab"
                :class="[
                  currentTab === item.value ? 'active' : '',
                  refreshing ? 'opacity-50 pointer-events-none' : '',
                ]"
              >
                <UTooltip :text="item.label" :delay-duration="300">
                  <div class="nav-tab-inner">
                    <UIcon
                      :name="item.icon"
                      class="text-base sm:text-lg"
                      :class="currentTab === item.value ? 'text-[var(--seo-green)]' : ''"
                    />
                    <span class="nav-label">{{ item.label }}</span>
                  </div>
                </UTooltip>
              </NuxtLink>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-1">
              <UTooltip text="Refresh" :delay-duration="300">
                <UButton
                  variant="ghost"
                  color="neutral"
                  size="sm"
                  icon="carbon:reset"
                  class="nav-action"
                  @click="refresh"
                />
              </UTooltip>

              <UTooltip text="GitHub" :delay-duration="300">
                <UButton
                  variant="ghost"
                  color="neutral"
                  size="sm"
                  icon="simple-icons:github"
                  to="https://github.com/nuxt-modules/sitemap"
                  target="_blank"
                  class="nav-action hidden sm:flex"
                />
              </UTooltip>
            </div>
          </nav>
        </div>
      </header>

      <!-- Main Content -->
      <div class="main-content">
        <main class="mx-auto flex flex-col w-full max-w-7xl">
          <div
            v-if="!data?.globalSources || refreshing"
            class="flex items-center justify-center py-20"
          >
            <UIcon
              name="carbon:circle-dash"
              class="animate-spin text-3xl text-[var(--color-text-muted)]"
            />
          </div>
          <NuxtPage v-else />
        </main>
      </div>
    </div>
  </UApp>
</template>

<style>
/* Header */
.header {
  border-bottom: 1px solid var(--color-border);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.625rem 1rem;
  max-width: 80rem;
  margin: 0 auto;
  width: 100%;
}

@media (min-width: 640px) {
  .header-content {
    padding: 0.75rem 1.25rem;
  }
}

.divider {
  width: 1px;
  height: 1.25rem;
  background: var(--color-border);
}

.brand-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: var(--radius-sm);
  background: oklch(65% 0.2 145 / 0.12);
  color: var(--seo-green);
}

/* Navigation tabs */
.nav-tabs {
  display: flex;
  align-items: center;
  gap: 0.125rem;
  padding: 0.25rem;
  border-radius: var(--radius-md);
  background: var(--color-surface-sunken);
  border: 1px solid var(--color-border-subtle);
}

.nav-tab {
  position: relative;
  border-radius: var(--radius-sm);
  transition: background 150ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 150ms cubic-bezier(0.22, 1, 0.36, 1);
}

.nav-tab-inner {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.5rem;
  color: var(--color-text-muted);
  font-size: 0.8125rem;
  font-weight: 500;
}

@media (min-width: 640px) {
  .nav-tab-inner {
    padding: 0.375rem 0.75rem;
  }
}

.nav-tab:hover .nav-tab-inner {
  color: var(--color-text);
}

.nav-tab.active {
  background: var(--color-surface-elevated);
  box-shadow: 0 1px 3px oklch(0% 0 0 / 0.08);
}

.dark .nav-tab.active {
  box-shadow: 0 1px 3px oklch(0% 0 0 / 0.3);
}

.nav-tab.active .nav-tab-inner {
  color: var(--color-text);
}

.nav-label {
  display: none;
}

@media (min-width: 640px) {
  .nav-label {
    display: inline;
  }
}

.nav-action {
  color: var(--color-text-muted) !important;
}

.nav-action:hover {
  color: var(--color-text) !important;
  background: var(--color-surface-sunken) !important;
}

/* Main content wrapper */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0.75rem;
  min-height: calc(100vh - 60px);
}

@media (min-width: 640px) {
  .main-content {
    padding: 1rem;
  }
}

@media (max-height: 600px) {
  .main-content {
    padding: 0;
    min-height: 0;
  }
}

/* Base HTML */
html {
  font-family: var(--font-sans);
  overflow-y: scroll;
  overscroll-behavior: none;
}

body {
  min-height: 100vh;
}

html.dark {
  color-scheme: dark;
}

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
