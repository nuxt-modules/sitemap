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
    <div
      v-else
      class="empty-state card"
    >
      <UIcon
        name="carbon:add-alt"
        class="empty-state-icon"
      />
      <p class="text-sm font-medium mb-1">
        No user sources configured
      </p>
      <p class="text-xs opacity-70 max-w-xs">
        Add custom sources via the <code class="px-1 py-0.5 rounded bg-[var(--color-surface-sunken)] text-[10px]">sources</code> option in your sitemap config.
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
