<script setup lang="ts">
import { prerenderRoutes } from '#imports'

prerenderRoutes([
  '/en/dynamic/foo',
  '/en/dynamic/bar',
])
</script>

<template>
  <div>
    <h1>{{ $t('welcome') }}</h1>
  </div>
</template>
