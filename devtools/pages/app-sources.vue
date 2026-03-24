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
    <DevtoolsEmptyState
      v-else
      title="No app sources detected"
      description="App sources are automatically discovered from your Nuxt application routes and pages."
      icon="carbon:bot"
    />
  </div>
</template>
