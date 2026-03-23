<script setup lang="ts">
import { data } from '../composables/state'
</script>

<template>
  <div class="space-y-5 animate-fade-up">
    <DevtoolsSection>
      <template #text>
        <h3 class="opacity-80 text-base mb-1">
          <UIcon name="carbon:settings" class="mr-1" />
          Runtime Config
        </h3>
      </template>
      <DevtoolsSnippet
        :code="JSON.stringify(data?.runtimeConfig, null, 2)"
        lang="json"
        label="Runtime Config"
      />
    </DevtoolsSection>
  </div>
</template>
