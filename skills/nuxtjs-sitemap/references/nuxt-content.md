# Nuxt Content v3

Tested with `@nuxt/content` 3.16.1.

## Opt a collection in

A collection is in the sitemap only when its schema has a `sitemap` field from `defineSitemapSchema()`.
A collection without it is left out, with no warning.

```ts
// content.config.ts
import { defineCollection, defineContentConfig } from '@nuxt/content'
import { defineSitemapSchema } from '@nuxtjs/sitemap/content'
import { z } from 'zod'

export default defineContentConfig({
  collections: {
    blog: defineCollection({
      type: 'page',
      source: 'blog/**/*.md',
      schema: z.object({
        draft: z.boolean().optional(),
        sitemap: defineSitemapSchema({
          name: 'blog', // must equal the collection key
          filter: entry => !entry.draft,
          onUrl: (url) => {
            url.loc = url.loc.replace('/blog/', '/articles/')
          },
        }),
      }),
    }),
  },
})
```

Put `@nuxtjs/sitemap` before `@nuxt/content` in `modules`. The module warns if the order is wrong.
`asSitemapCollection()` is deprecated. Use `defineSitemapSchema()` in the schema.

## Frontmatter

```md
---
sitemap:
  lastmod: 2024-01-15
  priority: 0.9
---
```

`sitemap: false` in frontmatter removes the page.

## Traps

- **`filter` and `onUrl` run as source text in the server bundle.** The module copies them with `toString()`. A variable, import, or helper from outside the function is undefined at runtime. The whole collection then drops out of the sitemap, the response is still 200, and the server log blames the content database. Write each callback with inline values only.
- **Method shorthand fails the build.** `onUrl(url) { ... }` gives "Expected ',', got '{'" in `virtual:#sitemap/content-on-url`. Write `onUrl: (url) => { ... }`.
- **`filter` or `onUrl` without `name` fails the build** with "name is required when using filter or onUrl".
- **`robots: false` in frontmatter does not remove the page** unless the schema also declares `robots`, for example `robots: z.boolean().optional()`. Without that field, Content strips the key. Use `sitemap: false` instead.
- **Serverless deploys can lose content URLs** when the content database is not readable at runtime. Prerender the sitemap, or configure a runtime database.
