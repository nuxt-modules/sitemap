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
          // On serverless (Vercel/Netlify functions) @nuxt/content restores its SQLite DB at
          // runtime from a prerendered sql_dump.txt, but that asset is served from the static
          // output and isn't readable inside the function, so the restore yields an empty DB and
          // this query throws (see https://github.com/nuxt/content/issues/3805). Degrade to an
          // empty source for this collection instead of 500ing the whole sitemap.
          console.error(`[@nuxtjs/sitemap] Couldn't query @nuxt/content collection "${collection}" for the sitemap, so its URLs will be missing. On serverless the content DB is restored from a prerendered sql_dump.txt that isn't readable inside the function (nuxt/content#3805). Fix: prerender the sitemap so content URLs resolve at build, or configure a runtime database (D1/Turso/Postgres).`, err)
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
