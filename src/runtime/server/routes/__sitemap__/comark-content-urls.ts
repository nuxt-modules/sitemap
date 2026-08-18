import type { SitemapUrl } from '../../../types'
import { queryCollection, queryCollectionManifest } from '@harlan-zw/comark-content/server'
import { defineEventHandler } from '#nuxtseo/h3'
import { filters } from '#sitemap/content-filters'
import { onUrlFns } from '#sitemap/content-on-url'

interface ComarkEntry {
  path?: string
  sitemap?: Partial<SitemapUrl> | boolean | null
  [key: string]: unknown
}

/**
 * URLs from comark-content collections.
 *
 * comark reads its collections from Nitro server assets in process, so unlike the
 * @nuxt/content route there is no database to restore and no serverless failure
 * mode to degrade around. The `sitemap` field on each entry is written by the
 * module's `content:file:afterParse` hook, which sets it to `null` for a page that
 * opted out. comark's query builder has no `IS NOT NULL` operator, so that filter
 * runs here instead of in the query.
 */
export default defineEventHandler(async (e) => {
  const manifest = await queryCollectionManifest(e)
  const collections = manifest.filter(entry => entry.sitemap).map(entry => entry.name)
  const results = await Promise.all(collections.map(async (collection) => {
    const needsAllFields = filters?.has(collection) || onUrlFns?.has(collection)
    const query = queryCollection(e, collection)
    if (!needsAllFields)
      query.select('path', 'sitemap')
    const entries = await query.all() as ComarkEntry[]
    const filter = filters?.get(collection)
    return { collection, entries: filter ? entries.filter(filter) : entries }
  }))
  return results.flatMap(({ collection, entries }) => {
    const onUrl = onUrlFns?.get(collection)
    return entries
      .filter(entry => entry.sitemap !== false && entry.sitemap !== null && entry.sitemap !== undefined)
      .filter(entry => entry.path && !entry.path.endsWith('.navigation'))
      .map((entry) => {
        const url: Record<string, unknown> = {
          loc: entry.path,
          ...(typeof entry.sitemap === 'object' && entry.sitemap ? entry.sitemap : {}),
        }
        onUrl?.(url, entry, collection)
        return url
      })
  })
})
