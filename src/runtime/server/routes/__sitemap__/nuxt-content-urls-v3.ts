import { defineEventHandler } from 'h3'
import { queryCollection } from '@nuxt/content/server'
import manifest from '#content/manifest'
import { filters } from '#sitemap/content-filters'

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
  const contentList: Promise<ContentEntry[]>[] = []
  for (const collection of collections) {
    const hasFilter = filters?.has(collection)
    // @ts-expect-error dynamic collection name
    const query = queryCollection(e, collection)
      .where('path', 'IS NOT NULL')
      .where('sitemap', 'IS NOT NULL')

    // only select specific fields if no filter, otherwise get all fields
    if (!hasFilter)
      // @ts-expect-error dynamic field names
      query.select('path', 'sitemap')

    contentList.push(
      query.all()
        .then((results) => {
          // apply runtime filter if available
          const filter = filters?.get(collection)
          return filter ? results.filter(filter) : results
        }),
    )
  }
  // we need to wait for all the queries to finish
  const results = await Promise.all(contentList)
  // we need to flatten the results
  return results
    .flatMap(entries => entries
      .filter(c => c.sitemap !== false && c.path)
      .map(c => ({
        loc: c.path,
        ...(typeof c.sitemap === 'object' ? c.sitemap : {}),
      })),
    )
    .filter(Boolean)
})
