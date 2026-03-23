<script setup lang="ts">
import type { SitemapSourceResolved } from '../../src/runtime/types'
import { joinURL } from 'ufo'
import { computed } from 'vue'
import { data } from '../composables/state'

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
  <DevtoolsSection>
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
          <DevtoolsMetric
            v-if="source.timeTakenMs"
            :value="source.timeTakenMs"
            label="ms"
            variant="info"
          />
        </div>
        <span class="font-semibold">{{ source.context.name }}</span>
        <DevtoolsMetric
          :value="source.urls?.length || 0"
          label="URLs"
          variant="success"
        />
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
    <DevtoolsAlert
      v-if="source.error"
      variant="warning"
    >
      {{ source.error }}
    </DevtoolsAlert>
    <template v-else>
      <DevtoolsAlert
        v-if="source._urlWarnings?.length"
        variant="warning"
      >
        <div>
          <div class="text-xs font-semibold mb-1">
            {{ source._urlWarnings.length }} URL warning{{ source._urlWarnings.length > 1 ? 's' : '' }}
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
      </DevtoolsAlert>
      <DevtoolsSnippet
        :code="JSON.stringify(source.urls, null, 2)"
        lang="json"
        label="URLs"
      />
    </template>
    <DevtoolsAlert
      v-if="source.context.tips?.length"
      variant="info"
    >
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
    </DevtoolsAlert>
  </DevtoolsSection>
</template>

<style scoped>
.url-warnings-list {
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 0.6875rem;
  line-height: 1.5;
  color: var(--color-text-muted);
}

.url-warnings-list li {
  padding: 0.125rem 0;
}

.url-warnings-list code {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  padding: 0.0625rem 0.3125rem;
  border-radius: 3px;
  background: var(--color-surface-sunken);
  color: var(--color-text);
}
</style>
