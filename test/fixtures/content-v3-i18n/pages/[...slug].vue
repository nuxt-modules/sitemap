<template>
  <div>
    <ContentRenderer v-if="page" :value="page" />
    <div v-else>
      Page not found
    </div>
  </div>
</template>
