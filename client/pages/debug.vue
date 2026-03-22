<script setup lang="ts">
import OCodeBlock from 'nuxtseo-shared/runtime/app/components/OCodeBlock'
import OSectionBlock from 'nuxtseo-shared/runtime/app/components/OSectionBlock'
import { data } from '../composables/state'
</script>

<template>
  <div class="space-y-5 animate-fade-up">
    <OSectionBlock>
      <template #text>
        <h3 class="opacity-80 text-base mb-1">
          <UIcon name="carbon:settings" class="mr-1" />
          Runtime Config
        </h3>
      </template>
      <OCodeBlock
        :code="JSON.stringify(data?.runtimeConfig, null, 2)"
        lang="json"
      />
    </OSectionBlock>
  </div>
</template>
