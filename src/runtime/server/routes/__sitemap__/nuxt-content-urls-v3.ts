import { defineEventHandler } from 'h3'
import { queryCollection } from '@nuxt/content/server'
// @ts-expect-error alias
import manifest from '#content/manifest'
import type { Collections } from '@nuxt/content'

export default defineEventHandler(async (e) => {
  const collections: (keyof Collections)[] = []
  // each collection in the manifest has a key => with fields which has a `sitemap`, we want to get all those
  for (const collection in manifest) {
    if (manifest[collection]?.fields?.sitemap) {
      collections.push(collection as keyof Collections)
    }
  }
  // now we need to handle multiple queries here, we want to run the requests in parralel
  const contentList = []
  for (const collection of collections) {
    contentList.push(
      queryCollection(e, collection)
        .select('path', 'sitemap')
        .where('path', 'IS NOT NULL')
        .where('sitemap', 'IS NOT NULL')
        .all(),
    )
  }
  // we need to wait for all the queries to finish
  const results = await Promise.all(contentList)
  // we need to flatten the results
  return results
    .flatMap((c) => {
      return c
        .filter(c => c.sitemap !== false && c.path)
        .flatMap(c => ({
          loc: c.path,
          // @ts-expect-error cannot figure out how to make sure this is resolvable when no Collections are in manifest
          ...(c.sitemap || {}),
        }))
    })
    .filter(Boolean)
})
