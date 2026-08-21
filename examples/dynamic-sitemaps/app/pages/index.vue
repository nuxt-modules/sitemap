<template>
  <div>
    <h1>Dynamic sitemaps example</h1>
    <p>See <code>/sitemap_index.xml</code> for runtime-registered per-market game sitemaps.</p>
    <!-- eslint-disable harlanzw/link-no-underscores -- sitemap routes use underscores -->
    <ul>
      <li><a href="/sitemap_index.xml">sitemap_index.xml</a></li>
      <li><a href="/__sitemap__/games-us-0.xml">games-us-0.xml</a></li>
      <li><a href="/__sitemap__/games-de-1.xml">games-de-1.xml</a></li>
    </ul>
    <!-- eslint-enable harlanzw/link-no-underscores -->
  </div>
</template>
