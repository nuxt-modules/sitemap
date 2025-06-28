<template>
  <div>
    <h1>Hello World</h1>
    <NuxtLink to="/crawled">
      crawled
    </NuxtLink>
    <NuxtLink to="/foo-redirect">
      should be ignored as its a redirect
    </NuxtLink>
    <br>
    <a href="/sitemap.xml">
      sitemap.xml
    </a>
  </div>
</template>
