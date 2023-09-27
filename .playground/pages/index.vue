<script setup lang="ts">
</script>

<template>
  <div>
    <h1 class="text-2xl mt-10 mb-5">
      Sitemap
    </h1>
    <div class="grid grid-cols-2 gap-5 max-w-[900px] mx-auto">
      <NuxtLink to="/ignore-foo">
        ignore-foo
      </NuxtLink>
      <NuxtLink to="/new-page">
        new page
      </NuxtLink>
      <NuxtLink to="/about">
        about
      </NuxtLink>
      <NuxtLink to="/secret">
        secret
      </NuxtLink>
      <NuxtLink to="/users-prerender">
        dynamic pre-render link
      </NuxtLink>
      <NuxtLink to="/blog">
        blog
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
a {
  display: block;
  margin: 0 0 10px 0;
  text-decoration: underline;
}
</style>
