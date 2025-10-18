<script setup lang="ts">
import { useHead } from '#imports'

useHead({
  meta: [
    { name: 'robots', content: 'noindex' },
  ],
})
</script>

<template>
  <div>This page should not be in the sitemap</div>
</template>
