<script setup lang="ts">
import { joinURL } from 'ufo'
import type { SitemapSourceResolved } from '../../src/runtime/types'
import { data } from '../composables/state'

const props = defineProps<{ source: SitemapSourceResolved; showContext?: boolean }>()

const fetchUrl = computed(() => {
  const url = typeof props.source.fetch === 'string' ? props.source.fetch : props.source.fetch![0]
  return joinURL(data.value?.nitroOrigin || 'localhost', url)
})
</script>

<template>
  <OSectionBlock>
    <template #text>
      <div class="flex space-x-5">
        <h3 class="text-gray-800 text-base mb-1 flex space-x-3 items-center">
          <div v-if="source.fetch" class="flex space-x-2">
            <NIcon icon="carbon:api-1" class="text-gray-500 text-lg" />
            <div v-if="source.timeTakenMs" class="text-gray-600 text-sm">
              {{ source.timeTakenMs }}ms
            </div>
          </div>
          <div>
            {{ source.context.name }}
          </div>
          <div>
            <NBadge>{{ source.urls?.length || 0 }}</NBadge>
          </div>
        </h3>
      </div>
    </template>
    <template #description>
      <div class="flex items-center space-x-3">
        <div v-if="source.fetch">
          <NLink :href="fetchUrl" target="_blank">
            {{ source.fetch }}
          </NLink>
        </div>
        <div v-if="source.context.description" class="text-xs mt-1 opacity-70">
          {{ source.context.description }}
        </div>
      </div>
    </template>
    <div v-if="source.error">
      <NIcon icon="carbon:warning" class="text-red-500" /> {{ source.error }}
    </div>
    <template v-else>
      <OCodeBlock class="max-h-[250px] overflow-y-auto" :code="JSON.stringify(source.urls, null, 2)" lang="json" />
      <div v-if="source.context.tips" class="px-3 py-3 mt-2 bg-gray-50/50 text-gray-700">
        <h3 class="text-sm font-bold mb-1">
          Hints
        </h3>
        <ul class="list-disc ml-5">
          <li v-for="(tip, key) in source.context.tips" :key="key" class="text-sm opacity-80 mb-1">
            {{ tip }}
          </li>
        </ul>
      </div>
    </template>
  </OSectionBlock>
</template>
