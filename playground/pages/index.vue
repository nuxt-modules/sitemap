<script setup lang="ts">
// does not work (yet?)
definePageMeta({
  sitemap: {
    lastmod: 'broken',
    changefreq: 'foo',
  },
})
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">
      Sitemap Playground
    </h1>
    <div class="grid grid-cols-2 gap-3 max-w-lg">
      <UButton to="/about" variant="soft" color="neutral">
        About
      </UButton>
      <UButton to="/blog" variant="soft" color="neutral">
        Blog
      </UButton>
      <UButton to="/new-page" variant="soft" color="neutral">
        New Page
      </UButton>
      <UButton to="/secret" variant="soft" color="neutral">
        Secret (robots: false)
      </UButton>
      <UButton to="/ignore-foo" variant="soft" color="neutral">
        ignore-foo
      </UButton>
      <UButton to="/users-prerender" variant="soft" color="neutral">
        Dynamic Pre-render
      </UButton>
    </div>
  </div>
</template>
