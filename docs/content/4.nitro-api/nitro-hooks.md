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

**Type:** `async (ctx: { event: H3Event; urls: SitemapUrlInput[]; sitemapName: string }) => void | Promise<void>`{lang="ts"}

Triggers once the raw list of URLs is collected from sources.

This hook is best used for inserting new URLs into the sitemap.

```ts [server/plugins/sitemap.ts]
import { defineNitroPlugin } from 'nitropack/runtime'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('sitemap:input', async (ctx) => {
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

**Type:** `async (ctx: { event: H3Event; urls: ResolvedSitemapUrl[]; sitemapName: string }) => void | Promise<void>`{lang="ts"}

Triggered once the final structure of the XML is generated, provides the URLs as objects.

With `experimentalStreaming` and production caching enabled, the finalized URL plan is cached. This hook runs on a plan cache miss or stale-while-revalidate refresh rather than on every sitemap response.

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

**Type:** `async (ctx: { event: H3Event; sitemaps: { sitemap: string, lastmod?: string }[] }) => void | Promise<void>`{lang="ts"}

Triggered once the final structure of the sitemap index is generated, provides the sitemaps as objects.

In a sitemap index, `lastmod` records when the sitemap file changed. Page modification dates belong to the URL entries inside that file. Use this hook to add accurate dates to generated sitemap entries. For chunked sitemaps, fetch the metadata in one query and map it by filename:

```ts [server/plugins/sitemap.ts]
import { defineNitroPlugin } from 'nitropack/runtime'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('sitemap:index-resolved', async ({ sitemaps }) => {
    // Your application should return W3C date strings keyed by sitemap filename.
    const lastmodByFile = await getSitemapLastmods()

    for (const entry of sitemaps) {
      const filename = new URL(entry.sitemap).pathname.split('/').pop()!
      const lastmod = lastmodByFile[filename]

      if (lastmod)
        entry.lastmod = lastmod
    }
  })
})
```

Avoid fetching the generated sitemap files from this hook. Query the database or metadata store that records when they changed instead.

The hook can also add another sitemap to the index:

```ts [server/plugins/sitemap.ts]
import { defineNitroPlugin } from 'nitropack/runtime'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('sitemap:index-resolved', ({ sitemaps }) => {
    sitemaps.push({
      sitemap: 'https://mysite.com/my-sitemap.xml',
      lastmod: '2026-07-20',
    })
  })
})
```

## `'sitemap:sitemaps-resolved'`{lang="ts"}

**Type:** `async (ctx: { event: H3Event; sitemaps: Record<string, SitemapDefinition> }) => void | Promise<void>`{lang="ts"}

Runs before the sitemap index is built and before any child sitemap is served. Use it to
register sitemaps while your server is running.

Sitemaps normally come from `nuxt.config`, so the list is fixed when you build. That's a
problem when the list depends on your data: a store with 20 markets and thousands of games
can't know at build time how many sitemap files it will eventually need. This hook closes
that gap. Add a definition to `ctx.sitemaps` and it works like any other sitemap: it's
served at its own URL, listed in the index, and passed the other hooks.

```ts [server/plugins/sitemap.ts]
import { defineNitroPlugin } from 'nitropack/runtime'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('sitemap:sitemaps-resolved', async ({ sitemaps }) => {
    // One sitemap per market, chunked by stable ID ranges from the database
    for (let chunk = 0; chunk < gameChunkCount(); chunk++) {
      const name = `games-${chunk}`
      if (!(name in sitemaps)) {
        sitemaps[name] = {
          sitemapName: name,
          sources: [`/api/__sitemap__/games?chunk=${chunk}`],
        }
      }
    }
  })
})
```

Two things worth knowing before you start.

First, the hook starts from a fresh copy of the sitemap config on every run. Don't try to
be incremental. Register everything you want each time; skip what you don't.

Second, chunk by stable ID ranges, not by position. If chunk 2 holds games 10001 to 15000,
it should always hold those games. Delete game 10002 and chunk 2 keeps its boundaries, so
its `lastmod` only changes when its own content changes. Positional chunks shift on every
delete, which makes their `lastmod` meaningless.

Definitions take the same fields as `nuxt.config`: `sources`, `urls` (a function works
too), `include`, `exclude`, `defaults`, and `chunks` / `chunkSize`. If you set both
`sources` and `urls`, `sources` wins. Everything else, like `autoLastmod` and
`sortEntries`, stays global.

::callout{icon="i-lucide-info" to="/docs/sitemap/api/config#sitemapsPathPrefix"}
Registered sitemaps need the default `sitemapsPathPrefix`. With a prefix of `/` or `false`, routes only exist for sitemap names known at build time.
::

One subtle point on `ctx.event`: it belongs to whichever request triggered the hook. With
caching on in production, requests to the same host share one resolved config, so another
request's event may have decided what's in your cache. Keep registration independent of
request headers.

### Removing sitemaps

Deleting a key works for static sitemaps too, not just registered ones. The sitemap leaves
the index and its route returns a 404.

The fresh-copy behavior makes removal easy: just stop registering a sitemap and it's gone
on the next run. An empty chunk needs no special handling. `delete` is for the sitemaps
you declared in config and no longer want:

```ts [server/plugins/sitemap.ts]
import { defineNitroPlugin } from 'nitropack/runtime'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('sitemap:sitemaps-resolved', async ({ sitemaps }) => {
    for (let chunk = 0; chunk < gameChunkCount(); chunk++) {
      const name = `games-${chunk}`
      // Empty chunks disappear on their own: don't register them
      if (isChunkEmpty(chunk))
        continue

      if (!(name in sitemaps)) {
        sitemaps[name] = { sitemapName: name, sources: [`/api/__sitemap__/games?chunk=${chunk}`] }
      }
    }

    // Static sitemaps need an explicit delete
    delete sitemaps.legacyPages
  })
})
```

### Caching

In development the hook runs on every request, so changes show up immediately.

In production with `cacheMaxAgeSeconds` set, the resolved sitemap list is cached for the
same window as the sitemaps themselves. Register or remove freely; the change lands on the
next refresh, on the same schedule your sitemap content already follows.

Keep one timing detail in mind after a removal: the sitemap list and the sitemap index
refresh on their own schedules. For up to one cache window, the index may still list a
sitemap whose route already returns a 404. Crawlers retry; if the window feels too long
for your traffic, lower `cacheMaxAgeSeconds`.

## `'sitemap:output'`{lang="ts"}

**Type:** `async (ctx: { event: H3Event; sitemap: string; sitemapName: string }) => void | Promise<void>`{lang="ts"}

Triggered before the sitemap is sent to the client.
It provides the sitemap as an XML string.

When `experimentalStreaming` is enabled, the XML string is created lazily. Reading or replacing `ctx.sitemap` buffers the complete XML response. A hook that only observes the event or sitemap name preserves streaming serialization. With `debug` enabled, check `X-Sitemap-Render-Mode` for `stream` or `buffered-hook`.

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

**Type:** `async (ctx: { event: H3Event; sitemapName: string; sources: SitemapSourceInput[] }) => void | Promise<void>`{lang="ts"}

Triggered before resolving sitemap sources. This hook allows you to:
- Add new sources dynamically
- Remove sources
- Modify source configurations including fetch options and headers

This hook runs before sources are resolved, providing full control over the source list.

```ts [server/plugins/sitemap.ts]
import { defineNitroPlugin } from 'nitropack/runtime'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('sitemap:sources', async (ctx) => {
    // Add a source that will be fetched
    ctx.sources.push('/api/dynamic-urls')

    // Add a source with fetch options
    ctx.sources.push(['/api/authenticated-urls', { headers: { 'X-Api-Key': 'secret' } }])

    // Add a resolved source with URLs directly (no fetch needed)
    ctx.sources.push({
      context: { name: 'my-custom-source' },
      urls: ['/page-1', '/page-2', { loc: '/page-3', priority: 0.8 }],
    })

    // Modify existing sources to add headers
    ctx.sources = ctx.sources.map((source) => {
      if (typeof source === 'object' && 'fetch' in source && source.fetch) {
        const [url, options = {}] = Array.isArray(source.fetch) ? source.fetch : [source.fetch, {}]

        // Add headers from original request
        const authHeader = ctx.event.node.req.headers.authorization
        if (authHeader) {
          options.headers = options.headers || {}
          options.headers.Authorization = authHeader
        }

        source.fetch = [url, options]
      }
      return source
    })

    // Filter out sources
    ctx.sources = ctx.sources.filter((source) => {
      if (typeof source === 'string')
        return !source.includes('skip-this')
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

```ts [server/plugins/sitemap.ts]
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
