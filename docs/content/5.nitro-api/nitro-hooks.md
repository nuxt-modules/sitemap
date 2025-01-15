---
title: Nitro Hooks
description: Learn how to use Nitro Hooks to customize your sitemap entries.
---

Nitro hooks can be added to modify the output of your sitemaps at runtime.

## `'sitemap:input'`{lang="ts"}

**Type:** `async (ctx: { urls: SitemapUrlInput[]; sitemapName: string }) => void | Promise<void>`{lang="ts"}

Triggers once the raw list of URLs is collected from sources.

This hook is best used for inserting new URLs into the sitemap.

```ts [server/plugins/sitemap.ts]
import { defineNitroPlugin } from 'nitropack/runtime'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('sitemap:resolved', async (ctx) => {
    // SitemapUrlInput is either a string 
    ctx.urls.push('/foo')
    // or an object with loc, changefreq, and priority
    ctx.urls.push({
      loc: '/bar',
      changefreq: 'daily',
      priority: 0.8,
    })
  })
})
```

## `'sitemap:resolved'`{lang="ts"}

**Type:** `async (ctx: { urls: ResolvedSitemapUrl[]; sitemapName: string }) => void | Promise<void>`{lang="ts"}

Triggered once the final structure of the XML is generated, provides the URLs as objects.

For new URLs it's recommended to use `sitemap:input` instead. Use this hook for modifying entries or removing them.

```ts [server/plugins/sitemap.ts]
import { defineNitroPlugin } from 'nitropack/runtime'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('sitemap:resolved', async (ctx) => {
    // single sitemap example - just add the url directly
    ctx.urls.push({
      loc: '/my-secret-url',
      changefreq: 'daily',
      priority: 0.8,
    })
    // multi sitemap example - filter for a sitemap name
    if (ctx.sitemapName === 'posts') {
      ctx.urls.push({
        loc: '/posts/my-post',
        changefreq: 'daily',
        priority: 0.8,
      })
    }
  })
})
```

## `'sitemap:index-resolved'`{lang="ts"}

**Type:** `async (ctx: { sitemaps: { sitemap: string, lastmod?: string }[] }) => void | Promise<void>`{lang="ts"}

Triggered once the final structure of the sitemap index is generated, provides the sitemaps as objects.

```ts [server/plugins/sitemap.ts]
import { defineNitroPlugin } from 'nitropack/runtime'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('sitemap:index-resolved', async (ctx) => {
    // add a new sitemap to the index
    ctx.sitemaps.push({
      sitemap: 'https://mysite.com/my-sitemap.xml',
      lastmod: new Date().toISOString(),
    })
  })
})
```

## `'sitemap:output'`{lang="ts"}

**Type:** `async (ctx: { sitemap: string; sitemapName: string }) => void | Promise<void>`{lang="ts"}

Triggered before the sitemap is sent to the client.
It provides the sitemap as a XML string.

```ts [server/plugins/sitemap.ts]
import { defineNitroPlugin } from 'nitropack/runtime'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('sitemap:output', async (ctx) => {
    // append a comment credit to the footer of the xml
    ctx.sitemap = `${ctx.sitemap}\n<!-- Sitemap output test-->`
  })
})
```

## Recipes

### Modify Sitemap `xmlns` attribute

For some search engines, you may need to add a custom `xmlns` attribute to the sitemap. You can do this with a simple
search and replace in the `sitemap:output` hook.

```ts [server/plugins/sitemap.ts]
import { defineNitroPlugin } from 'nitropack/runtime'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('sitemap:output', async (ctx) => {
    ctx.sitemap = ctx.sitemap.replace('<urlset ', '<urlset xmlns:mobile="http://www.baidu.com/schemas/sitemap-mobile/1/" ')
  })
})
```

### Modify Video Entries For Host

Sometimes you'll want to include the videos from your markup automatically but exclude some of them based on the host.

```ts
import { defineNitroPlugin } from 'nitropack/runtime'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('sitemap:resolved', (ctx) => {
    ctx.urls.map((url) => {
      if (url.videos?.length) {
        url.videos = url.videos.filter((video) => {
          if (video.content_loc) {
            const url = new URL(video.content_loc)
            return url.host.startsWith('www.youtube.com')
          }
          return false
        })
      }
      return url
    })
  })
})
```
