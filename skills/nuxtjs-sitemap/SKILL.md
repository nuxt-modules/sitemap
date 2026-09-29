---
name: nuxtjs-sitemap
description: Generate, split, and debug XML sitemaps in a Nuxt app with the @nuxtjs/sitemap module. Use when a task mentions sitemap.xml, sitemap_index.xml, the sitemap config key, defineSitemapEventHandler, dynamic sitemap URLs from a CMS or API, multiple or chunked sitemaps, zeroRuntime, hreflang in sitemaps with @nuxtjs/i18n, defineSitemapSchema for Nuxt Content, or a page that is missing from or wrongly present in the sitemap.
---

# @nuxtjs/sitemap

Tested against the `@nuxtjs/sitemap` release that ships this Skill, on Nuxt 4.5.2 (the module requires Nuxt `>=3.9.0`).
The module serves `/sitemap.xml`, built from app pages, route rules, prerendered routes, and your sources.
Docs: https://nuxtseo.com/docs/sitemap

## Setup

Set `site.url`. Every `<loc>` resolves against it.
If `site.url` is missing, the production server uses the request `Host` header. The build gives no warning.
In dev, `<loc>` always uses the dev server host. This is expected.

If `@nuxtjs/robots` is installed, the module adds the sitemap to `robots.txt`. It uses `/sitemap_index.xml` when there are multiple sitemaps.

## Automatic behaviour

- Every static page is listed. Dynamic pages, such as `pages/blog/[slug].vue`, are not listed. Add them with a source.
- Prerendered routes are added, including routes the prerender crawler finds.
- A route with the `robots: false` route rule is dropped. So is a `robots` string with `noindex` or `none`.
- When a page is prerendered, `<img>` and `<video>` inside `<main>` become image and video entries. `article:modified_time` becomes `lastmod`.
- Entries are sorted by path depth, then alphabetically. Set `sortEntries: false` to keep source order.
- An invalid `lastmod` is dropped from the entry. Dev prints an XML comment in its place.
- In production, the resolved sitemap is cached for `cacheMaxAgeSeconds` (600 by default). Dev and prerender do not cache.

## Add dynamic URLs

Return the entries from a server route, then list the route in `sources`.
`defineSitemapEventHandler()` is auto imported in server code. It adds types only, no cache.

```ts
// server/api/__sitemap__/urls.ts
export default defineSitemapEventHandler(async () => {
  const posts = await $fetch<{ slug: string, updatedAt: string }[]>('https://cms.example.com/posts')
  return posts.map(post => ({
    loc: `/blog/${post.slug}`, // a path; it resolves against site.url
    lastmod: post.updatedAt,
  }))
})
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  sitemap: {
    sources: ['/api/__sitemap__/urls'],
  },
})
```

A source can also be a remote JSON or XML URL, or `[url, { headers }]` for an authenticated API.
If a CMS returns encoded paths, set `_encoded: true` on each entry to stop double encoding.

`urls` in the config also adds entries, but the function runs once at build time. Use `sources` for data that changes after deploy.

## Remove or tune one page

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  routeRules: {
    '/checkout/**': { robots: false }, // drop from the sitemap
    '/legal': { sitemap: false }, // drop from the sitemap only
    '/about': { sitemap: { priority: 0.3, changefreq: 'yearly' } },
  },
  sitemap: {
    exclude: ['/admin/**', /^\/preview-/],
  },
})
```

`definePageMeta({ sitemap: { priority: 0.8 } })` sets values for that page. `definePageMeta({ sitemap: false })` removes it, also when it is prerendered.

## Multiple sitemaps

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  sitemap: {
    sitemaps: {
      pages: { includeAppSources: true, exclude: ['/blog/**'] },
      posts: { sources: ['/api/__sitemap__/posts'], chunks: 5000 },
    },
  },
})
```

- The index is `/sitemap_index.xml`. `/sitemap.xml` redirects to it.
- Child sitemaps are at `/__sitemap__/<name>.xml`. Chunks are `/__sitemap__/posts-0.xml`, `posts-1.xml`, and so on.
- `sitemapsPathPrefix: '/'` moves them to the root: `/pages.xml`, `/posts-0.xml`.
- App sources (pages, route rules, prerender) go only to a sitemap with `includeAppSources: true`.
- Top level `sources` also go only to sitemaps with `includeAppSources: true`.
- An entry with `_sitemap: 'posts'` goes only to that sitemap. An unknown name logs an error and drops the entry.
- `sitemaps: true` splits every URL into numbered chunks of `defaultSitemapsChunkSize` (1000).

## Prerender and zero runtime

To prerender the sitemap, add `/sitemap.xml` to `nitro.prerender.routes`. `nuxt generate` does this for you.
`zeroRuntime: true` prerenders every sitemap and removes the sitemap code from the server bundle.
In both modes, sources are fetched once at build. New CMS entries do not appear until the next build.

## Integrations

- Nuxt Content v3: a collection needs `defineSitemapSchema()` in its schema, or it is not in the sitemap. See [references/nuxt-content.md](references/nuxt-content.md).
- `@nuxtjs/i18n`: with a prefix strategy, each locale gets its own sitemap, with `hreflang` alternatives and `x-default`.
  The sitemap name is the locale `language` if it is set, else the locale `code`. With `language: 'en-US'`, the path is `/__sitemap__/en-US.xml`.
  A dynamic entry goes only to the default locale sitemap. Set `_i18nTransform: true` to add it to every locale with its prefix.
  `_sitemap` takes the sitemap name. `_sitemap: 'en'` fails when the sitemap is `en-US`.
  Set `autoI18n: false` for one sitemap without locales.

## Traps

- **String filters match whole path segments only.** `exclude: ['/blog/draft-*']` removes nothing. Use a RegExp such as `/^\/blog\/draft-/`.
- **A dynamic route is not in the sitemap** until a source, `urls`, or the prerender crawler provides its URLs.
- **A prerendered or `zeroRuntime` sitemap never refetches sources.** Use the runtime server for CMS data that changes between deploys.
- **Nuxt Content `filter` and `onUrl` cannot read outside variables.** The build fails and names the variable. See [references/nuxt-content.md](references/nuxt-content.md).
- **`lastmod` set to the current date on every build tells crawlers nothing.** Use a real content update time.

## Config

- `sources`, `urls`, `include`, `exclude`, `defaults`: top level for one sitemap. With `sitemaps`, set them per sitemap.
- `excludeAppSources`: `true`, or names such as `['nuxt:pages', 'nuxt:prerender']`.
- `sitemapName` (`sitemap.xml`): the path of the single sitemap. Ignored with `sitemaps`.
- `cacheMaxAgeSeconds` (600): server cache and `Cache-Control`. `false` turns both off.
- `xsl` (`/__sitemap__/style.xsl`): the browser view. Set `false` for raw XML. Browsers show raw i18n XML as text; that is a browser bug.
- Other options: https://nuxtseo.com/docs/sitemap/api/config

Nitro hooks change output at runtime: `sitemap:sources` (add sources or request headers), `sitemap:input`, `sitemap:resolved`, `sitemap:output`, and `sitemap:sitemaps-resolved` (register sitemaps at runtime). See https://nuxtseo.com/docs/sitemap/nitro-api/nitro-hooks

## Debug

- `/__sitemap__/debug.json` lists every source, its URLs, and fetch errors. It exists in dev, or in production with `debug: true`. `zeroRuntime` removes it.
- Nuxt DevTools has a Sitemap tab with the same data.
- For a prerendered sitemap, set `debug: true` and read `.output/public/__sitemap__/debug.json`.
