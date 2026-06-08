import { queryCollection } from '@nuxt/content/server'
import { defineEventHandler } from 'h3'
import manifest from '#content/manifest'
import { filters } from '#sitemap/content-filters'
import { onUrlFns } from '#sitemap/content-on-url'

interface ContentEntry {
  path?: string
  sitemap?: object | boolean
}

export default defineEventHandler(async (e) => {
  const collections: string[] = []
  // each collection in the manifest has a key => with fields which has a `sitemap`, we want to get all those
  for (const collection in manifest) {
    // @ts-expect-error nuxt content v3
    if (manifest[collection].fields.sitemap)
      collections.push(collection)
  }
  // now we need to handle multiple queries here, we want to run the requests in parallel
  const contentList: Promise<{ collection: string, entries: ContentEntry[] }>[] = []
  for (const collection of collections) {
    const needsAllFields = filters?.has(collection) || onUrlFns?.has(collection)
    // @ts-expect-error dynamic collection name
    const query = queryCollection(e, collection)
      .where('path', 'IS NOT NULL')
      .where('sitemap', 'IS NOT NULL')

    // only select specific fields if no filter/onUrl, otherwise get all fields
    if (!needsAllFields)
      // @ts-expect-error dynamic field names
      query.select('path', 'sitemap')

    contentList.push(
      query.all()
        .then((results) => {
          // apply runtime filter if available
          const filter = filters?.get(collection)
          return { collection, entries: filter ? results.filter(filter) : results }
        })
        .catch((err) => {
          // On serverless (Vercel/Netlify functions) @nuxt/content v3 restores its
          // SQLite DB at runtime from a prerendered sql_dump.txt that isn't bundled
          // into the function, so this query can throw. Degrade to an empty source
          // for this collection instead of 500ing the entire sitemap. The query only
          // succeeds at build, so prerender the sitemap to include these entries.
          console.error(`[@nuxtjs/sitemap] Failed to query @nuxt/content collection "${collection}" for the sitemap; returning no URLs for it. On serverless the content DB is restored at runtime from a prerendered dump that isn't bundled into the function. Prerender the sitemap to include these URLs.`, err)
          return { collection, entries: [] as ContentEntry[] }
        }),
    )
  }
  // we need to wait for all the queries to finish
  const results = await Promise.all(contentList)
  // we need to flatten the results
  return results
    .flatMap(({ collection, entries }) => {
      const onUrl = onUrlFns?.get(collection)
      return entries
        .filter(c => c.sitemap !== false && c.path && !c.path.endsWith('.navigation'))
        .map((c) => {
          const url: Record<string, unknown> = {
            loc: c.path,
            ...(typeof c.sitemap === 'object' ? c.sitemap : {}),
          }
          onUrl?.(url, c, collection)
          return url
        })
    })
    .filter(Boolean)
})
