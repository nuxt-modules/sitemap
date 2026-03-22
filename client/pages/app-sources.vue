<script setup lang="ts">
import { computed } from 'vue'
import Source from '../components/Source.vue'
import { data } from '../composables/state'

const appSources = computed(() => (data.value?.globalSources || []).filter(s => s.sourceType === 'app'))
</script>

<template>
  <div class="space-y-5 animate-fade-up">
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
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.5rem;
  text-align: center;
  color: var(--color-text-muted);
}

.empty-state-icon {
  font-size: 2.5rem;
  opacity: 0.4;
  margin-bottom: 1rem;
}
</style>
