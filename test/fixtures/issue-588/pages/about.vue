<script setup lang="ts">
useHead({
  link: [
    { rel: 'alternate', hreflang: 'de-DE', href: 'https://example.de/about' },
    { rel: 'alternate', hreflang: 'fr-FR', href: 'https://example.fr/about' },
    { rel: 'alternate', hreflang: 'it-IT', href: 'https://example.it/about' },
  ],
})
</script>

<template>
  <div>
    <h1>About</h1>
  </div>
</template>
