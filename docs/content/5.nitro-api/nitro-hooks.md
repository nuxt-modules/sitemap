---
title: Nitro Hooks
description: Learn how to use Nitro Hooks to customize your sitemap entries.
relatedPages:
  - path: /docs/sitemap/getting-started/data-sources
    title: Data Sources
  - path: /docs/sitemap/guides/dynamic-urls
    title: Dynamic URL Endpoints
  - path: /docs/sitemap/guides/multi-sitemaps
    title: Multi Sitemaps
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

## `'sitemap:sources'`{lang="ts"}

**Type:** `async (ctx: { event: H3Event; sitemapName: string; sources: (SitemapSourceBase | SitemapSourceResolved)[] }) => void | Promise<void>`{lang="ts"}

Triggered before resolving sitemap sources. This hook allows you to:
- Add new sources dynamically
- Remove sources
- Modify source configurations including fetch options and headers

This hook runs before sources are resolved, providing full control over the source list.

```ts [server/plugins/sitemap.ts]
import { defineNitroPlugin } from 'nitropack/runtime'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('sitemap:sources', async (ctx) => {
    // Add a new source
    ctx.sources.push('/api/dynamic-urls')
    
    // Modify existing sources to add headers
    ctx.sources = ctx.sources.map(source => {
      if (typeof source === 'object' && source.fetch) {
        const [url, options = {}] = Array.isArray(source.fetch) ? source.fetch : [source.fetch, {}]
        
        // Add headers from original request
        const authHeader = ctx.event.node.req.headers.authorization
        if (authHeader) {
          options.headers = options.headers || {}
          options.headers['Authorization'] = authHeader
        }
        
        source.fetch = [url, options]
      }
      return source
    })
    
    // Filter out sources
    ctx.sources = ctx.sources.filter(source => {
      if (typeof source === 'string') {
        return !source.includes('skip-this')
      }
      return true
    })
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
