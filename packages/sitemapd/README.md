# sitemapd

Runtime-neutral sitemap parsing and bounded traversal for Node, browsers, [Bun](https://bun.sh),
and workerd.

```ts
import { collectSitemap } from 'sitemapd/parse'

const result = await collectSitemap(response.body!)
```

Use `sitemapd` for an injected reader and `sitemapd/fetch` for the generic Fetch
adapter. Network authority, DNS security, storage, and product policy remain
the host's responsibility.

## Bounded traversal

`createSitemapReader()` accepts injected document loading and target
authorization. Its `walk()` method owns one aggregate breadth-first budget
across every root and descendant:

```ts
import { createSitemapReader } from 'sitemapd'

const reader = createSitemapReader({
  loadDocument,
  authorizeTarget,
  limits: {
    maxDepth: 3,
    maxDocuments: 100,
    maxUrls: 2_000_000,
  },
})

const digests = new Map<string, string>()
const result = await reader.walk(roots, {
  concurrency: 4,
  retention: 'none',
  async onDocument(document) {
    if (document.document._tag === 'urlset')
      digests.set(document.resolvedUrl, await digest(document.document.entries))
  },
})
```

Reads may finish out of order. The reader visits each document once in
deterministic breadth-first order while preserving root and index-child order.
The visitor is awaited serially and applies backpressure to traversal.

`retention: 'all'` is the default and retains deduplicated URL entries plus
index references in the result. `retention: 'none'` returns empty aggregate
arrays after the visitor processes each document. This keeps only the bounded
scheduler window and caller-owned reductions in memory. The `entriesRetained`
discriminator narrows these result shapes.

`maxUrls` counts URL records in breadth-first commit order, including duplicates.
This conservative accounting is identical in both retention modes.
`urlsObserved` and `referencesObserved` expose the aggregate counters. Reaching
any traversal budget returns an explicit partial result.

Passing an `AbortSignal` stops scheduling, aborts active reads cooperatively,
and returns a partial result with the `cancelled` reason. A visitor rejection or
an unexpected loader or authorizer exception aborts active reads and rejects
`walk()` with the original error. Tagged read failures remain values in the
walk result.
