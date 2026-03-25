<template>
  <div>
    <h1>Sitemap Dynamic URLs Example</h1>
    <nav>
      <NuxtLink to="/">
        Home
      </NuxtLink>
      <NuxtLink to="/blog/post-1">
        Post 1
      </NuxtLink>
      <NuxtLink to="/blog/post-2">
        Post 2
      </NuxtLink>
      <NuxtLink to="/blog/post-3">
        Post 3
      </NuxtLink>
    </nav>
    <p>
      <a href="/sitemap.xml">View Sitemap</a>
    </p>
    <p>Dynamic URLs are generated via server/api/_sitemap-urls.ts.</p>
    <NuxtPage />
  </div>
</template>
