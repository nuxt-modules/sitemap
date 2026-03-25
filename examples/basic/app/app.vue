<template>
  <div>
    <h1>Sitemap Basic Example</h1>
    <nav>
      <NuxtLink to="/">
        Home
      </NuxtLink>
      <NuxtLink to="/about">
        About
      </NuxtLink>
      <NuxtLink to="/contact">
        Contact
      </NuxtLink>
    </nav>
    <p>
      <a href="/sitemap.xml">View Sitemap</a>
    </p>
    <NuxtPage />
  </div>
</template>
