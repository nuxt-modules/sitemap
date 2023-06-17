<script lang="ts" setup>
import {definePageMeta} from "#imports";

definePageMeta({
  breadcrumbTitle: 'Home'
})
</script>
<template>
<div>
  <h1>Hello world</h1>
  <p>Welcome to my website</p>
  <NuxtLink to="/about">about</NuxtLink>
  <NuxtLink to="/secret">secret</NuxtLink>
  <NuxtLink to="/users-prerender">dynamic pre-render link</NuxtLink>
</div>
</template>
