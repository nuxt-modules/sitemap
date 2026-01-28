<script setup lang="ts">
import { joinURL } from 'ufo'
import type { SitemapSourceResolved } from '../../src/runtime/types'
import { data } from '../composables/state'
import { computed } from 'vue'

const props = defineProps<{ source: SitemapSourceResolved, showContext?: boolean }>()

const fetchUrl = computed(() => {
  const url = typeof props.source.fetch === 'string' ? props.source.fetch : props.source.fetch![0]
  if (url.includes('http'))
    return url
  return joinURL(data.value?.nitroOrigin || 'localhost', url)
})

function normaliseTip(tip: string) {
  return tip.replace(/`([^`]+)`/g, '<code>$1</code>')
}
</script>

<template>
  <OSectionBlock>
    <template #text>
      <div class="flex items-center gap-3">
        <div
          v-if="source.fetch"
          class="flex items-center gap-1.5"
        >
          <UIcon
            name="carbon:api-1"
            class="text-[var(--color-text-muted)]"
          />
          <span
            v-if="source.timeTakenMs"
            class="timing-badge"
          >
            {{ source.timeTakenMs }}ms
          </span>
        </div>
        <span class="font-semibold">{{ source.context.name }}</span>
        <span class="url-count">
          {{ source.urls?.length || 0 }} URLs
        </span>
      </div>
    </template>
    <template #description>
      <div class="flex items-center gap-3">
        <a
          v-if="source.fetch"
          :href="fetchUrl"
          target="_blank"
          class="link-external text-sm"
        >
          {{ source.fetch }}
        </a>
        <span
          v-if="source.context.description"
          class="text-xs text-[var(--color-text-muted)]"
        >
          {{ source.context.description }}
        </span>
      </div>
    </template>
    <div
      v-if="source.error"
      class="flex items-center gap-2 text-red-500"
    >
      <UIcon name="carbon:warning" />
      <span>{{ source.error }}</span>
    </div>
    <template v-else>
      <div
        v-if="source._urlWarnings?.length"
        class="url-warnings"
      >
        <div class="url-warnings-header">
          <UIcon name="carbon:warning-alt" />
          <span>{{ source._urlWarnings.length }} URL warning{{ source._urlWarnings.length > 1 ? 's' : '' }}</span>
        </div>
        <ul class="url-warnings-list">
          <li
            v-for="(w, i) in source._urlWarnings"
            :key="i"
          >
            <code>{{ w.loc }}</code> — {{ w.message }}
          </li>
        </ul>
      </div>
      <OCodeBlock
        class="max-h-[250px] overflow-y-auto"
        :code="JSON.stringify(source.urls, null, 2)"
        lang="json"
      />
    </template>
    <div
      v-if="source.context.tips?.length"
      class="hint-callout mt-3"
    >
      <UIcon
        name="carbon:idea"
        class="hint-callout-icon text-base flex-shrink-0 mt-0.5"
      />
      <div>
        <h3 class="text-xs font-semibold mb-1.5 text-[var(--color-text)] uppercase tracking-wide opacity-70">
          Hints
        </h3>
        <ul class="space-y-1">
          <li
            v-for="(tip, key) in source.context.tips"
            :key="key"
            class="text-sm text-[var(--color-text-muted)] leading-relaxed"
            v-html="normaliseTip(tip)"
          />
        </ul>
      </div>
    </div>
  </OSectionBlock>
</template>
