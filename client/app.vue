<script setup lang="ts">
import { computed, ref } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { joinURL } from 'ufo'
import type { SitemapDefinition } from '../src/runtime/types'
import { loadShiki, renderCodeHighlight } from './composables/shiki'
import { colorMode } from './composables/rpc'
import { data, refreshSources } from './composables/state'
import { useHead } from '#imports'
import 'floating-vue/dist/style.css'

await loadShiki()

const loading = ref(false)

async function refresh() {
  loading.value = true
  data.value = null
  await refreshSources()
  setTimeout(() => {
    loading.value = false
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
  return joinURL(data.value.nitroOrigin, data.value.runtimeConfig?.sitemapsPathPrefix, `${sitemapName}-sitemap.xml`)
}

function resolveSitemapOptions(definition: SitemapDefinition) {
  const options: Record<string, any> = {}
  // add all definition keys / values that have a defined value
  Object.entries(definition).forEach(([key, value]) => {
    if (value !== undefined && (!Array.isArray(value) || value.length > 0) && key !== 'includeAppSources')
      options[key] = value
  })
  return options
}

useHead({
  htmlAttrs: {
    class: () => colorMode.value || '',
  },
})

const appSourcesExcluded = computed(() => data.value?.runtimeConfig?.excludeAppSources || [])
const appSources = computed(() => (data.value?.globalSources || []).filter(s => s.sourceType === 'app'))
const userSources = computed(() => (data.value?.globalSources || []).filter(s => s.sourceType === 'user'))
</script>

<template>
  <div class="relative n-bg-base flex flex-col">
    <header class="sticky top-0 z-2 px-4 pt-4">
      <div
        class="flex justify-between items-start"
        mb2
      >
        <div class="flex space-x-5">
          <h1
            text-xl
            flex
            items-center
            gap-2
          >
            <NIcon
              icon="carbon:load-balancer-application"
              class="text-blue-300"
            />
            Sitemap <NBadge class="text-sm">
              {{ data?.runtimeConfig?.version }}
            </NBadge>
          </h1>
        </div>
        <div class="flex items-center space-x-3 text-xl">
          <fieldset
            class="n-select-tabs flex flex-inline flex-wrap items-center border n-border-base rounded-lg n-bg-base"
          >
            <label
              v-for="(value, idx) of ['sitemaps', 'user-sources', 'app-sources', 'debug', 'docs']"
              :key="idx"
              class="relative n-border-base hover:n-bg-active cursor-pointer"
              :class="[
                idx ? 'border-l n-border-base ml--1px' : '',
                value === tab ? 'n-bg-active' : '',
              ]"
            >
              <div
                v-if="value === 'sitemaps'"
                :class="[value === tab ? '' : 'op35']"
              >
                <VTooltip>
                  <div class="px-5 py-2">
                    <h2
                      text-lg
                      flex
                      items-center
                    >
                      <NIcon icon="carbon:load-balancer-application opacity-50" />
                      <NBadge class="text-sm">
                        {{ Object.keys(data?.sitemaps || {}).length || 0 }}
                      </NBadge>
                    </h2>
                  </div>
                  <template #popper>
                    Sitemaps
                  </template>
                </VTooltip>
              </div>
              <div
                v-if="value === 'user-sources'"
                :class="[value === tab ? '' : 'op35']"
              >
                <VTooltip>
                  <div class="px-5 py-2">
                    <h2
                      text-lg
                      flex
                      items-center
                    >
                      <NIcon icon="carbon:group-account opacity-50" />
                      <NBadge class="text-sm">
                        {{ userSources.length }}
                      </NBadge>
                    </h2>
                  </div>
                  <template #popper>
                    User Sources
                  </template>
                </VTooltip>
              </div>
              <div
                v-if="value === 'app-sources'"
                :class="[value === tab ? '' : 'op35']"
              >
                <VTooltip>
                  <div class="px-5 py-2">
                    <h2
                      text-lg
                      flex
                      items-center
                    >
                      <NIcon icon="carbon:bot opacity-50" />
                      <NBadge class="text-sm">
                        {{ appSources.length }}
                      </NBadge>
                    </h2>
                  </div>
                  <template #popper>
                    App Sources
                  </template>
                </VTooltip>
              </div>
              <div
                v-else-if="value === 'debug'"
                :class="[value === tab ? '' : 'op35']"
              >
                <VTooltip>
                  <div class="px-5 py-2">
                    <h2
                      text-lg
                      flex
                      items-center
                    >
                      <NIcon icon="carbon:debug opacity-50" />
                    </h2>
                  </div>
                  <template #popper>
                    Debug
                  </template>
                </VTooltip>
              </div>
              <div
                v-else-if="value === 'docs'"
                :class="[value === tab ? '' : 'op35']"
              >
                <VTooltip>
                  <div class="px-5 py-2">
                    <h2
                      text-lg
                      flex
                      items-center
                    >
                      <NIcon icon="carbon:book opacity-50" />
                    </h2>
                  </div>
                  <template #popper>
                    Documentation
                  </template>
                </VTooltip>
              </div>
              <input
                v-model="tab"
                type="radio"
                :value="value"
                :title="value"
                class="absolute cursor-pointer pointer-events-none inset-0 op-0.1"
              >
            </label>
          </fieldset>
          <VTooltip>
            <button
              text-lg=""
              type="button"
              class="n-icon-button n-button n-transition n-disabled:n-disabled"
              @click="refresh"
            >
              <NIcon
                icon="carbon:reset"
                class="group-hover:text-green-500"
              />
            </button>
            <template #popper>
              Refresh
            </template>
          </VTooltip>
        </div>
        <div class="items-center space-x-3 hidden lg:flex">
          <div class="opacity-80 text-sm">
            <NLink
              href="https://github.com/sponsors/harlan-zw"
              target="_blank"
            >
              <NIcon
                icon="carbon:favorite"
                class="mr-[2px]"
              />
              Sponsor
            </NLink>
          </div>
          <div class="opacity-80 text-sm">
            <NLink
              href="https://github.com/nuxt-modules/sitemap"
              target="_blank"
            >
              <NIcon
                icon="logos:github-icon"
                class="mr-[2px]"
              />
              Submit an issue
            </NLink>
          </div>
          <a
            href="https://nuxtseo.com"
            target="_blank"
            class="flex items-end gap-1.5 font-semibold text-xl dark:text-white font-title"
          >
            <NuxtSeoLogo />
          </a>
        </div>
      </div>
    </header>
    <div
      class="flex-row flex p4 h-full"
      style="min-height: calc(100vh - 64px);"
    >
      <main class="mx-auto flex flex-col w-full bg-white dark:bg-black dark:bg-dark-700 bg-light-200 ">
        <NLoading v-if="!data?.globalSources || loading" />
        <template v-else>
          <div
            v-if="tab === 'sitemaps'"
            class="space-y-5"
          >
            <div>
              <h2 class="text-lg mb-1">
                Sitemaps
              </h2>
              <p
                text-xs
                op60
              >
                The sitemaps generated from your site.
              </p>
            </div>
            <OSectionBlock
              v-for="(sitemap, key) in data.sitemaps"
              :key="key"
            >
              <template #text>
                <h3 class="opacity-80 text-base mb-1">
                  {{ sitemap.sitemapName }}
                  <NIcon
                    v-if="(sitemap.sources || []).some(s => !!s.error)"
                    icon="carbon:warning"
                    class="text-red-500"
                  />
                </h3>
              </template>
              <template #description>
                <NLink
                  target="_blank"
                  :href="resolveSitemapUrl(sitemap.sitemapName)"
                >
                  {{ resolveSitemapUrl(sitemap.sitemapName) }}
                </NLink>
              </template>
              <div class="px-3 py-2 space-y-5">
                <template v-if="sitemap.sitemapName === 'index'">
                  <div>
                    <div class="text-sm mb-1 opacity-80">
                      This is a special sitemap file that links to your other sitemaps.
                    </div>
                    <div class="text-sm opacity-70">
                      You can learn about this on the <NLink
                        underline
                        target="_blank"
                        href="https://developers.google.com/search/docs/crawling-indexing/sitemaps/large-sitemaps"
                      >
                        Google Search Central
                      </NLink>.
                    </div>
                  </div>
                </template>
                <template v-else>
                  <div
                    v-if="sitemap.sources && sitemap.sources.length"
                    class="flex space-x-5"
                  >
                    <div class="w-40">
                      <div class="font-bold text-sm mb-1">
                        Sources
                      </div>
                      <div class="opacity-40 text-xs max-w-60">
                        Local sources associated with just this sitemap.<br>Example: Load in a dynamic list of URLs from an API endpoint.
                      </div>
                    </div>
                    <div class="flex-grow">
                      <Source
                        v-for="(source, k) in sitemap.sources"
                        :key="k"
                        :source="source"
                      />
                    </div>
                  </div>
                  <div class="flex space-x-5">
                    <div class="w-40">
                      <div class="font-bold text-sm mb-1">
                        App Sources
                      </div>
                      <div class="opacity-40 text-xs max-w-60">
                        Configured with the <code>includeAppSources</code> option.
                      </div>
                    </div>
                    <div class="flex-grow flex flex-col justify-center">
                      <div
                        v-if="sitemap.includeAppSources && appSourcesExcluded !== true"
                        class="opacity-70"
                      >
                        <NIcon
                          icon="carbon:checkmark"
                          class="text-green-500 text-lg"
                        />
                        Enabled
                      </div>
                      <div
                        v-else
                        class="opacity-70"
                      >
                        <NIcon
                          icon="carbon:close"
                          class="text-red-500 text-lg"
                        />
                        Disabled
                      </div>
                      <div class="opacity-50 text-xs mt-2">
                        Switch to <NLink
                          underline
                          class="cursor-pointer"
                          @click="tab = 'app-sources'"
                        >
                          App sources
                        </NLink> to learn more.
                      </div>
                    </div>
                  </div>
                  <div class="flex space-x-5">
                    <div class="w-40">
                      <div class="font-bold text-sm mb-1">
                        Sitemap Options
                      </div>
                      <div class="opacity-40 text-xs max-w-60">
                        Extra options used to filter the URLs on the final sitemap and set defaults.
                      </div>
                    </div>
                    <div class="n-bg-base/20 flex-grow">
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
          <div
            v-else-if="tab === 'app-sources'"
            class="space-y-5"
          >
            <div>
              <h2 class="text-lg mb-1">
                App Sources
              </h2>
              <p
                text-xs
                op60
              >
                Automatic global sources generated from your application.
              </p>
            </div>
            <Source
              v-for="(source, key) in appSources"
              :key="key"
              :source="source"
            />
          </div>
          <div
            v-else-if="tab === 'user-sources'"
            class="space-y-5"
          >
            <div>
              <h2 class="text-lg mb-1">
                User Sources
              </h2>
              <p
                text-xs
                op60
              >
                Manually provided global sources provided by you.
              </p>
            </div>
            <Source
              v-for="(source, key) in userSources"
              :key="key"
              :source="source"
            />
          </div>
          <div
            v-else-if="tab === 'debug'"
            class="h-full max-h-full overflow-hidden"
          >
            <OSectionBlock>
              <template #text>
                <h3 class="opacity-80 text-base mb-1">
                  <NIcon
                    icon="carbon:settings"
                    class="mr-1"
                  />
                  Runtime Config
                </h3>
              </template>
              <div class="px-3 py-2 space-y-5">
                <OCodeBlock
                  :code="JSON.stringify(data?.runtimeConfig, null, 2)"
                  lang="json"
                />
              </div>
            </OSectionBlock>
          </div>
          <div
            v-else-if="tab === 'docs'"
            class="h-full max-h-full overflow-hidden"
          >
            <iframe
              src="https://nuxtseo.com/sitemap"
              class="w-full h-full border-none"
              style="min-height: calc(100vh - 100px);"
            />
          </div>
        </template>
      </main>
    </div>
  </div>
</template>

<style>
header {
  -webkit-backdrop-filter: blur(2px);
  backdrop-filter: blur(2px);
  background-color: #fffc;
}

.dark header {
  background-color: #111c;
}

html {
  --at-apply: font-sans;
  overflow-y: scroll;
  overscroll-behavior: none;
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}
body::-webkit-scrollbar {
  display: none;
}
body {
  /* trap scroll inside iframe */
  height: calc(100vh + 1px);
}

html.dark {
  background: #111;
  color-scheme: dark;
}

/* Markdown */
.n-markdown a {
  --at-apply: text-primary hover:underline;
}
.prose a {
  --uno: hover:text-primary;
}
.prose code::before {
  content: ""
}
.prose code::after {
  content: ""
}
.prose hr {
  --uno: border-solid border-1 border-b border-base h-1px w-full block my-2 op50;
}

/* JSON Editor */
textarea {
  background: #8881
}

:root {
  --jse-theme-color: #fff !important;
  --jse-text-color-inverse: #777 !important;
  --jse-theme-color-highlight: #eee !important;
  --jse-panel-background: #fff !important;
  --jse-background-color: var(--jse-panel-background) !important;
  --jse-error-color: #ee534150 !important;
  --jse-main-border: none !important;
}

.dark, .jse-theme-dark {
  --jse-panel-background: #111 !important;
  --jse-theme-color: #111 !important;
  --jse-text-color-inverse: #fff !important;
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
  border-radius: 5px !important;
}

/* Scrollbar */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar:horizontal {
  height: 6px;
}

::-webkit-scrollbar-corner {
  background: transparent;
}

::-webkit-scrollbar-track {
  background: var(--c-border);
  border-radius: 1px;
}

::-webkit-scrollbar-thumb {
  background: #8881;
  transition: background 0.2s ease;
  border-radius: 1px;
}

::-webkit-scrollbar-thumb:hover {
  background: #8885;
}

.no-scrollbar::-webkit-scrollbar {
  display: none;
  width: 0 !important;
  height: 0 !important;
}
</style>
