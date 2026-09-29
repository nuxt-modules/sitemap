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

`sitemap: false` in frontmatter removes the page. So does `robots: false`, or a `robots` string with `noindex` or `none`, such as `robots: noindex, nofollow`. The schema does not need a `robots` field.

## Traps

- **`filter` and `onUrl` run as source text in the server bundle.** A variable, import, or helper from outside the callback does not exist there. The build fails with "The `filter` callback of collection "blog" reads `HIDDEN` from outside the callback". Move the value inside the callback. Arrows, function expressions, and method shorthand all work.
- **`filter` or `onUrl` without `name` fails the build** with "name is required when using filter or onUrl".
- **Serverless deploys can lose content URLs** when the content database is not readable at runtime. Prerender the sitemap, or configure a runtime database.
