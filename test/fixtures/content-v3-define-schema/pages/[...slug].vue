<template>
  <ContentRenderer :value="page" />
</template>

<script setup lang="ts">
const { data: page } = await useAsyncData('page', () => queryCollection('content').path(useRoute().path).first())
</script>
