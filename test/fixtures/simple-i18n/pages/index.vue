<script setup lang="ts">
import { useI18n } from '#imports'

const i18n = useI18n()
const { t } = useI18n()
</script>

<template>
  <div>
    <h1>{{ $t('welcome') }}</h1>
  </div>
</template>
