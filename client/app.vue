<script setup lang="ts">
import { computed, ref } from 'vue'
import type { SitemapDefinition } from '../src/runtime/types'
import { loadShiki } from './composables/shiki'
import { colorMode } from './composables/rpc'
import { data, refreshSources } from './composables/state'
import { useHead } from '#imports'

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

const tab = ref('sitemaps')

function resolveSitemapUrl(sitemapName: string) {
  if (!data.value)
    return ''
  if (sitemapName === 'sitemap' || sitemapName === 'sitemap.xml')
    return `${data.value.nitroOrigin}sitemap.xml`
  if (sitemapName === 'index')
    return `${data.value.nitroOrigin}sitemap_index.xml`
  return `${data.value.nitroOrigin}${sitemapName}-sitemap.xml`
}

function resolveSitemapOptions(definition: SitemapDefinition) {
  const options: Record< string, any> = {}
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
  <div class="relative p8 n-bg-base flex flex-col h-screen">
    <div>
      <div class="flex justify-between items-center" mb6>
        <div>
          <h1 text-xl mb2 flex items-center gap-2>
            <NIcon icon="carbon:load-balancer-application" class="text-blue-300" />
            Nuxt Simple Sitemap <NBadge class="text-sm">
              {{ data?.runtimeConfig?.version }}
            </NBadge>
          </h1>
          <div class="space-x-3 mt-1 ml-1 opacity-80 text-sm">
            <NLink href="https://nuxtseo.com/sitemap" target="_blank">
              <NuxtSeoLogo class="mr-[2px] w-5 h-5 inline" />
              Documentation
            </NLink>
            <NLink href="https://github.com/nuxt/sitemap" target="_blank">
              <NIcon icon="logos:github-icon" class="mr-[2px]" />
              Submit an issue
            </NLink>
          </div>
        </div>
        <div>
          <a href="https://nuxtseo.com" target="_blank" class="flex items-end gap-1.5 font-semibold text-xl dark:text-white font-title">
            <NuxtSeoLogo />
            <span class="hidden sm:block">Nuxt</span><span class="sm:text-green-500 dark:sm:text-green-400">SEO</span>
          </a>
        </div>
      </div>
    </div>
    <div class="mb-6 text-xl">
      <fieldset
        class="n-select-tabs flex flex-inline flex-wrap items-center border n-border-base rounded-lg n-bg-base"
      >
        <label
          v-for="(value, idx) of ['sitemaps', 'user-sources', 'app-sources']"
          :key="idx"
          class="relative n-border-base hover:n-bg-active px-0.5em py-0.1em"
          :class="[
            idx ? 'border-l n-border-base ml--1px' : '',
            value === tab ? 'n-bg-active' : '',
          ]"
        >
          <div v-if="value === 'app-sources'" :class="[value === tab ? '' : 'op35']">
            <div class="px-2 py-1">
              <h2 text-lg flex items-center gap-2 mb-1>
                <NIcon icon="carbon:connect-source opacity-50" />
                App Sources <NBadge class="text-sm">
                  {{ appSources.length }}
                </NBadge>
              </h2>
              <p text-xs op60>
                Automatic global sources generated from your application.
              </p>
            </div>
          </div>
          <div v-else-if="value === 'user-sources'" :class="[value === tab ? '' : 'op35']">
            <div class="px-2 py-1">
              <h2 text-lg flex items-center gap-2 mb-1>
                <NIcon icon="carbon:connect-source opacity-50" />
                User Sources <NBadge class="text-sm">
                  {{ userSources.length }}
                </NBadge>
              </h2>
              <p text-xs op60>
                Manually provided global sources provided by you.
              </p>
            </div>
          </div>
          <div v-else-if="value === 'sitemaps'" :class="[value === tab ? '' : 'op35']">
            <div class="px-2 py-1">
              <h2 text-lg flex items-center gap-2 mb-1>
                <NIcon icon="carbon:load-balancer-application opacity-50" />
                Sitemaps <NBadge class="text-sm">
                  {{ data?.sitemaps.length }}
                </NBadge>
              </h2>
              <p text-xs op60>
                The sitemaps generated from your site.
              </p>
            </div>
          </div>
          <input
            v-model="tab"
            type="radio"
            :value="value"
            :title="value"
            class="absolute inset-0 op-0.1"
          >
        </label>
      </fieldset>
      <button
        class="ml-5 hover:shadow-lg text-xs transition items-center gap-2 inline-flex border-green-500/50 border-1 rounded-lg shadow-sm px-3 py-1"
        @click="refresh"
      >
        <div v-if="!loading">
          Refresh Data
        </div>
        <NIcon v-else icon="carbon:progress-bar-round" class="animated animate-spin op50 text-xs" />
      </button>
    </div>
    <div>
      <NLoading v-if="!data?.globalSources || loading" />
      <template v-else>
        <div v-if="tab === 'sitemaps'" class="space-y-5">
          <OSectionBlock v-for="(sitemap, key) in data.sitemaps" :key="key">
            <template #text>
              <h3 class="opacity-80 text-base mb-1">
                {{ sitemap.sitemapName }}
                <NIcon v-if="(sitemap.sources || []).some(s => !!s.error)" icon="carbon:warning" class="text-red-500" />
              </h3>
            </template>
            <template #description>
              <NLink target="_blank" :href="resolveSitemapUrl(sitemap.sitemapName)">
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
                    You can learn about this on the <NLink underline target="_blank" href="https://developers.google.com/search/docs/crawling-indexing/sitemaps/large-sitemaps">
                      Google Search Central
                    </NLink>.
                  </div>
                </div>
              </template>
              <template v-else>
                <div v-if="sitemap.sources && sitemap.sources.length" class="flex space-x-5">
                  <div class="w-40">
                    <div class="font-bold text-sm mb-1">
                      Sources
                    </div>
                    <div class="opacity-40 text-xs max-w-60">
                      Local sources associated with just this sitemap.<br>Example: Load in a dynamic list of URLs from an API endpoint.
                    </div>
                  </div>
                  <div class="flex-grow">
                    <Source v-for="(source, k) in sitemap.sources" :key="k" :source="source" />
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
                    <div v-if="sitemap.includeAppSources && appSourcesExcluded !== true" class="opacity-70">
                      <NIcon icon="carbon:checkmark" class="text-green-500 text-lg" />
                      Enabled
                    </div>
                    <div v-else class="opacity-70">
                      <NIcon icon="carbon:close" class="text-red-500 text-lg" />
                      Disabled
                    </div>
                    <div class="opacity-50 text-xs mt-2">
                      Switch to <NLink underline class="cursor-pointer" @click="tab = 'app-sources'">
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
                    <OCodeBlock class="max-h-[350px] min-h-full overflow-y-auto" :code="JSON.stringify(resolveSitemapOptions(sitemap), null, 2)" lang="json" />
                  </div>
                </div>
              </template>
            </div>
          </OSectionBlock>
        </div>
        <div v-if="tab === 'app-sources'" class="space-y-5">
          <Source v-for="(source, key) in appSources" :key="key" :source="source" />
        </div>
        <div v-if="tab === 'user-sources'" class="space-y-5">
          <Source v-for="(source, key) in userSources" :key="key" :source="source" />
        </div>
      </template>
    </div>
    <div class="flex-auto" />
  </div>
</template>
