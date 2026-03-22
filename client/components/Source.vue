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

<style scoped>
/* URL count pill */
.url-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.5rem;
  padding: 0.125rem 0.5rem;
  font-size: 0.6875rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  border-radius: 9999px;
  background: oklch(65% 0.2 145 / 0.12);
  color: var(--seo-green);
}

/* Timing badge */
.timing-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.375rem;
  font-size: 0.625rem;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  border-radius: var(--radius-sm);
  background: var(--color-surface-sunken);
  color: var(--color-text-subtle);
  border: 1px solid var(--color-border-subtle);
}

/* URL validation warnings */
.url-warnings {
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md);
  background: oklch(85% 0.1 85 / 0.1);
  border: 1px solid oklch(70% 0.12 85 / 0.2);
  margin-bottom: 0.5rem;
}

:deep(.dark) .url-warnings {
  background: oklch(30% 0.06 85 / 0.15);
  border-color: oklch(50% 0.08 85 / 0.25);
}

.url-warnings-header {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: oklch(55% 0.15 85);
  margin-bottom: 0.375rem;
}

:deep(.dark) .url-warnings-header {
  color: oklch(75% 0.12 85);
}

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
