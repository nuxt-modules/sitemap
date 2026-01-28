<script setup lang="ts">
import { computed, ref } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { joinURL } from 'ufo'
import type { SitemapDefinition } from '../src/runtime/types'
import { loadShiki } from './composables/shiki'
import { colorMode } from './composables/rpc'
import { data, refreshSources } from './composables/state'
import { useHead } from '#imports'

await loadShiki()

const loading = ref(false)
const refreshing = ref(false)

async function refresh() {
  if (refreshing.value) return
  refreshing.value = true
  loading.value = true
  data.value = null
  await refreshSources()
  setTimeout(() => {
    loading.value = false
    refreshing.value = false
  }, 300)
}

const tab = useLocalStorage('@nuxtjs/sitemap:tab', 'sitemaps')

function resolveSitemapUrl(sitemapName: string) {
  if (!data.value)
    return ''
  if (sitemapName === 'sitemap' || sitemapName === 'sitemap.xml')
    return `${data.value.nitroOrigin}sitemap.xml`
  if (sitemapName === 'index')
    return `${data.value.nitroOrigin}sitemap_index.xml`
  return joinURL(data.value.nitroOrigin, data.value.runtimeConfig?.sitemapsPathPrefix || '', `${sitemapName}-sitemap.xml`)
}

function resolveSitemapOptions(definition: SitemapDefinition) {
  const options: Record<string, any> = {}
  Object.entries(definition).forEach(([key, value]) => {
    if (value !== undefined && (!Array.isArray(value) || value.length > 0) && key !== 'includeAppSources')
      options[key] = value
  })
  return options
}

const isDark = computed(() => colorMode.value === 'dark')
useHead({
  title: 'Nuxt Sitemap',
  htmlAttrs: {
    class: () => isDark.value ? 'dark' : '',
  },
})

const appSourcesExcluded = computed(() => data.value?.runtimeConfig?.excludeAppSources || [])
const appSources = computed(() => (data.value?.globalSources || []).filter(s => s.sourceType === 'app'))
const userSources = computed(() => (data.value?.globalSources || []).filter(s => s.sourceType === 'user'))

const navItems = [
  { value: 'sitemaps', icon: 'carbon:load-balancer-application', label: 'Sitemaps', count: () => Object.keys(data.value?.sitemaps || {}).length || 0 },
  { value: 'user-sources', icon: 'carbon:group-account', label: 'User Sources', count: () => userSources.value.length },
  { value: 'app-sources', icon: 'carbon:bot', label: 'App Sources', count: () => appSources.value.length },
  { value: 'debug', icon: 'carbon:debug', label: 'Debug' },
  { value: 'docs', icon: 'carbon:book', label: 'Docs' },
]
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
                <UIcon
                  name="carbon:load-balancer-application"
                  class="text-base sm:text-lg"
                />
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
                {{ data?.runtimeConfig?.version }}
              </UBadge>
            </div>
          </div>

          <!-- Navigation -->
          <nav class="flex items-center gap-1 sm:gap-2">
            <!-- Nav Tabs -->
            <div class="nav-tabs">
              <button
                v-for="item of navItems"
                :key="item.value"
                type="button"
                class="nav-tab"
                :class="[
                  tab === item.value ? 'active' : '',
                  loading ? 'opacity-50 pointer-events-none' : '',
                ]"
                @click="tab = item.value"
              >
                <UTooltip
                  :text="item.label"
                  :delay-duration="300"
                >
                  <div class="nav-tab-inner">
                    <UIcon
                      :name="item.icon"
                      class="text-base sm:text-lg"
                      :class="tab === item.value ? 'text-[var(--seo-green)]' : ''"
                    />
                    <span class="nav-label">{{ item.label }}</span>
                    <UBadge
                      v-if="item.count"
                      color="neutral"
                      variant="subtle"
                      size="xs"
                      class="ml-1 hidden sm:inline-flex"
                    >
                      {{ item.count() }}
                    </UBadge>
                  </div>
                </UTooltip>
              </button>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-1">
              <UTooltip
                text="Refresh"
                :delay-duration="300"
              >
                <UButton
                  square
                  variant="ghost"
                  color="neutral"
                  size="sm"
                  icon="carbon:reset"
                  class="nav-action"
                  :class="{ 'refresh-spinning': refreshing }"
                  :disabled="refreshing"
                  @click="refresh"
                />
              </UTooltip>

              <UTooltip
                text="GitHub"
                :delay-duration="300"
              >
                <UButton
                  square
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
      <div
        class="flex-1 flex flex-col p-3 sm:p-4"
        style="min-height: calc(100vh - 60px);"
      >
        <main class="mx-auto flex flex-col w-full max-w-7xl">
          <div
            v-if="!data?.globalSources || loading"
            class="flex items-center justify-center py-20"
          >
            <UIcon
              name="carbon:circle-dash"
              class="animate-spin text-3xl text-[var(--color-text-muted)]"
            />
          </div>
          <template v-else>
            <!-- Sitemaps Tab -->
            <div
              v-if="tab === 'sitemaps'"
              class="space-y-5 animate-fade-up"
            >
              <div>
                <h2 class="text-lg font-semibold mb-1">
                  Sitemaps
                </h2>
                <p class="text-xs text-[var(--color-text-muted)]">
                  The sitemaps generated from your site.
                </p>
              </div>
              <OSectionBlock
                v-for="(sitemap, key) in data.sitemaps"
                :key="key"
              >
                <template #text>
                  <div class="flex items-center gap-2">
                    <span class="font-semibold">{{ sitemap.sitemapName }}</span>
                    <UIcon
                      v-if="(sitemap.sources || []).some(s => typeof s !== 'string' && 'error' in s && !!s.error)"
                      name="carbon:warning"
                      class="text-red-500"
                    />
                    <UIcon
                      v-else-if="(sitemap.sources || []).some(s => typeof s !== 'string' && '_urlWarnings' in s && s._urlWarnings?.length)"
                      name="carbon:warning-alt"
                      class="text-amber-500"
                    />
                  </div>
                </template>
                <template #description>
                  <a
                    target="_blank"
                    :href="resolveSitemapUrl(sitemap.sitemapName)"
                    class="link-external text-sm"
                  >
                    {{ resolveSitemapUrl(sitemap.sitemapName) }}
                  </a>
                </template>
                <div class="space-y-5">
                  <template v-if="sitemap.sitemapName === 'index'">
                    <div class="hint-callout">
                      <UIcon
                        name="carbon:information"
                        class="hint-callout-icon text-lg flex-shrink-0 mt-0.5"
                      />
                      <div class="text-sm text-[var(--color-text-muted)]">
                        This is a special sitemap file that links to your other sitemaps.
                        <a
                          href="https://developers.google.com/search/docs/crawling-indexing/sitemaps/large-sitemaps"
                          target="_blank"
                          class="link-external"
                        >
                          Learn more
                        </a>
                      </div>
                    </div>
                  </template>
                  <template v-else>
                    <div
                      v-if="sitemap.sources && sitemap.sources.length"
                      class="flex gap-5"
                    >
                      <div class="w-40 flex-shrink-0">
                        <div class="font-semibold text-sm mb-1">
                          Sources
                        </div>
                        <div class="text-xs text-[var(--color-text-muted)]">
                          Local sources associated with just this sitemap.
                        </div>
                      </div>
                      <div class="flex-grow space-y-2">
                        <Source
                          v-for="(source, k) in sitemap.sources"
                          :key="k"
                          :source="source"
                        />
                      </div>
                    </div>
                    <div class="flex gap-5">
                      <div class="w-40 flex-shrink-0">
                        <div class="font-semibold text-sm mb-1">
                          App Sources
                        </div>
                        <div class="text-xs text-[var(--color-text-muted)]">
                          Configured with the <code class="px-1 py-0.5 rounded bg-[var(--color-surface-sunken)]">includeAppSources</code> option.
                        </div>
                      </div>
                      <div class="flex-grow flex flex-col justify-center">
                        <div
                          v-if="sitemap.includeAppSources && appSourcesExcluded !== true"
                          class="status-enabled"
                        >
                          <UIcon
                            name="carbon:checkmark"
                            class="text-sm"
                          />
                          <span>Enabled</span>
                        </div>
                        <div
                          v-else
                          class="status-disabled"
                        >
                          <UIcon
                            name="carbon:close"
                            class="text-sm"
                          />
                          <span>Disabled</span>
                        </div>
                        <div class="text-xs text-[var(--color-text-subtle)] mt-2">
                          Switch to
                          <button
                            type="button"
                            class="text-[var(--seo-green)] hover:underline"
                            @click="tab = 'app-sources'"
                          >
                            App sources
                          </button>
                          to learn more.
                        </div>
                      </div>
                    </div>
                    <div class="flex gap-5">
                      <div class="w-40 flex-shrink-0">
                        <div class="font-semibold text-sm mb-1">
                          Sitemap Options
                        </div>
                        <div class="text-xs text-[var(--color-text-muted)]">
                          Extra options used to filter the URLs on the final sitemap and set defaults.
                        </div>
                      </div>
                      <div class="flex-grow">
                        <OCodeBlock
                          class="max-h-[350px] min-h-full overflow-y-auto"
                          :code="JSON.stringify(resolveSitemapOptions(sitemap), null, 2)"
                          lang="json"
                        />
                      </div>
                    </div>
                  </template>
                </div>
              </OSectionBlock>
            </div>

            <!-- App Sources Tab -->
            <div
              v-else-if="tab === 'app-sources'"
              class="space-y-5 animate-fade-up"
            >
              <div>
                <h2 class="text-lg font-semibold mb-1">
                  App Sources
                </h2>
                <p class="text-xs text-[var(--color-text-muted)]">
                  Automatic global sources generated from your application.
                </p>
              </div>
              <template v-if="appSources.length">
                <Source
                  v-for="(source, key) in appSources"
                  :key="key"
                  :source="source"
                />
              </template>
              <div
                v-else
                class="empty-state card"
              >
                <UIcon
                  name="carbon:bot"
                  class="empty-state-icon"
                />
                <p class="text-sm font-medium mb-1">
                  No app sources detected
                </p>
                <p class="text-xs opacity-70 max-w-xs">
                  App sources are automatically discovered from your Nuxt application routes and pages.
                </p>
              </div>
            </div>

            <!-- User Sources Tab -->
            <div
              v-else-if="tab === 'user-sources'"
              class="space-y-5 animate-fade-up"
            >
              <div>
                <h2 class="text-lg font-semibold mb-1">
                  User Sources
                </h2>
                <p class="text-xs text-[var(--color-text-muted)]">
                  Manually provided global sources provided by you.
                </p>
              </div>
              <template v-if="userSources.length">
                <Source
                  v-for="(source, key) in userSources"
                  :key="key"
                  :source="source"
                />
              </template>
              <div
                v-else
                class="empty-state card"
              >
                <UIcon
                  name="carbon:add-alt"
                  class="empty-state-icon"
                />
                <p class="text-sm font-medium mb-1">
                  No user sources configured
                </p>
                <p class="text-xs opacity-70 max-w-xs">
                  Add custom sources via the <code class="px-1 py-0.5 rounded bg-[var(--color-surface-sunken)] text-[10px]">sources</code> option in your sitemap config.
                </p>
              </div>
            </div>

            <!-- Debug Tab -->
            <div
              v-else-if="tab === 'debug'"
              class="space-y-5 animate-fade-up"
            >
              <OSectionBlock
                icon="carbon:settings"
                text="Runtime Config"
              >
                <OCodeBlock
                  :code="JSON.stringify(data?.runtimeConfig, null, 2)"
                  lang="json"
                />
              </OSectionBlock>
            </div>

            <!-- Docs Tab -->
            <div
              v-else-if="tab === 'docs'"
              class="h-full animate-fade-up"
            >
              <iframe
                src="https://nuxtseo.com/sitemap"
                class="w-full h-full border-none rounded-lg"
                style="min-height: calc(100vh - 100px);"
              />
            </div>
          </template>
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
  transition: all 150ms cubic-bezier(0.22, 1, 0.36, 1);
  background: transparent;
  border: none;
  cursor: pointer;
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.nav-action:hover {
  color: var(--color-text) !important;
  background: var(--color-surface-sunken) !important;
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

textarea:focus {
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

.no-main-menu {
  border: none !important;
}

.jse-main {
  min-height: 1em !important;
}

.jse-contents {
  border-width: 0 !important;
  border-radius: var(--radius-md) !important;
}

/* Hide scrollbar utility */
.no-scrollbar::-webkit-scrollbar {
  display: none;
  width: 0 !important;
  height: 0 !important;
}

.no-scrollbar {
  scrollbar-width: none;
}
</style>
