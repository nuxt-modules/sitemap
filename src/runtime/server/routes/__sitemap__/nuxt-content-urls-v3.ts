import { defineEventHandler } from 'h3'
// @ts-expect-error alias
import { queryCollectionWithEvent } from '#sitemap/content-v3-nitro-path'
// @ts-expect-error alias
import manifest from '#content/manifest'

export default defineEventHandler(async (e) => {
  const collections = []
  // each collection in the manifest has a key => with fields which has a `sitemap`, we want to get all those
  for (const collection in manifest) {
    if (manifest[collection].fields.sitemap) {
      collections.push(collection)
    }
  }
  // now we need to handle multiple queries here, we want to run the requests in parralel
  const contentList = []
  for (const collection of collections) {
    contentList.push(queryCollectionWithEvent(e, collection).select('path', 'sitemap').where('path', 'IS NOT NULL').all())
  }
  // we need to wait for all the queries to finish
  const results = await Promise.all(contentList)
  // we need to flatten the results
  return results.flat().map(c => ({ loc: c.path, ...c.sitemap })).filter(Boolean)
})
