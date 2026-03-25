<template>
  <div>
    <h1>Sitemap i18n Example</h1>
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
    <p>Sitemap includes alternate hreflang entries for en, fr, and de locales.</p>
    <NuxtPage />
  </div>
</template>
