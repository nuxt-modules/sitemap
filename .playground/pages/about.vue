<script lang="ts" setup>
import {defineI18nRoute} from "#imports";

defineI18nRoute({
  paths: {
    en: '/about',
    fr: '/a-propos',
    ja: '/about-ja'
  }
})
</script>
<template>
  <div>
    About page
    <img src="https://res.cloudinary.com/dl6o1xpyq/image/upload/f_jpg,q_auto:best,dpr_auto,w_240,h_240/images/harlan-wilton" alt="Harlan Wilton">
  </div>
</template>
