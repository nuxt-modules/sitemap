<script setup lang="ts">
import { computed } from 'vue'
import Source from '../components/Source.vue'
import { data } from '../composables/state'

const userSources = computed(() => (data.value?.globalSources || []).filter(s => s.sourceType === 'user'))
</script>

<template>
  <div class="space-y-5 animate-fade-up">
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
    <DevtoolsEmptyState
      v-else
      title="No user sources configured"
      description="Add custom sources via the sources option in your sitemap config."
      icon="carbon:add-alt"
    />
  </div>
</template>
