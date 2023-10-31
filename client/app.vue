<script setup lang="ts">
import { ref } from 'vue'
import { loadShiki } from './composables/shiki'
import { data, refreshSources } from './composables/state'

await loadShiki()

const loading = ref(false)

async function refresh() {
  loading.value = true
  await refreshSources()
  setTimeout(() => {
    loading.value = false
  }, 300)
}
</script>

<template>
  <div class="relative p8 n-bg-base flex flex-col h-screen">
    <div>
      <div class="flex justify-between" mb6>
        <div>
          <h1 text-xl mb2 flex items-center gap-2>
            <NIcon icon="carbon:load-balancer-application text-blue-300" />
            Nuxt Simple Sitemap <span v-if="data?.buildTimeMeta" class="text-sm opacity-60">{{ data.buildTimeMeta.version }}</span>
          </h1>
        </div>
      </div>
    </div>
    <div class="flex items-center space-x-5">
      <div>
        <h2 text-lg mb2 flex items-center gap-2>
          <NIcon icon="carbon:connect-source opacity-50" />
          Sources <span class="text-sm opacity-60">{{ data?.sources.length }}</span>
        </h2>
        <p text-sm op60 mb3>
          See the sources used to generate your sitemap.
        </p>
      </div>
      <button
        class="mr-5 hover:shadow-lg text-xs transition items-center gap-2 inline-flex border-green-500/50 border-1 rounded-lg shadow-sm px-3 py-1"
        @click="refresh"
      >
        <div v-if="!loading">
          Refresh
        </div>
        <NIcon v-else icon="carbon:progress-bar-round" class="animated animate-spin op50 text-xs" />
      </button>
    </div>
    <div class="space-y-10">
      <div v-for="source in data?.sources">
        <div v-if="source.count > 0" class="mb-3">
          <h3 class="text-gray-800 text-base mb-1">
            {{ source.context }} <span class="bg-gray-100 rounded text-gray-500 px-1 text-xs">{{ source.count }}</span>
          </h3>
          <div v-if="source.path" class="text-sm flex items-center opacity-70 space-x-3">
            <div>{{ source.path }}</div>
            <div v-if="source.timeTakenMs" class="text-gray-700">
              {{ source.timeTakenMs }}ms
            </div>
          </div>
        </div>
        <OCodeBlock class="max-h-[350px] max-w-2/3 overflow-y-auto" :code="JSON.stringify(source.urls, null, 2)" lang="json" />
      </div>
    </div>
    <div class="flex-auto" />
  </div>
</template>
