import type { Collection, PageCollectionItemBase } from '@nuxt/content'
import type { TypeOf } from 'zod'
import { z } from 'zod'

declare global {
  var __sitemapCollectionFilters: Map<string, (entry: any) => boolean> | undefined
  var __sitemapCollectionOnUrlFns: Map<string, (url: any, entry: any, collection: string) => void> | undefined
}

if (!globalThis.__sitemapCollectionFilters)
  globalThis.__sitemapCollectionFilters = new Map()
if (!globalThis.__sitemapCollectionOnUrlFns)
  globalThis.__sitemapCollectionOnUrlFns = new Map()

const collectionFilters = globalThis.__sitemapCollectionFilters
const collectionOnUrlFns = globalThis.__sitemapCollectionOnUrlFns

export const schema = z.object({
  sitemap: z.object({
    loc: z.string().optional(),
    lastmod: z.date().optional(),
    changefreq: z.union([z.literal('always'), z.literal('hourly'), z.literal('daily'), z.literal('weekly'), z.literal('monthly'), z.literal('yearly'), z.literal('never')]).optional(),
    priority: z.number().optional(),
    images: z.array(z.object({
      loc: z.string(),
      caption: z.string().optional(),
      geo_location: z.string().optional(),
      title: z.string().optional(),
      license: z.string().optional(),
    })).optional(),
    videos: z.array(z.object({
      content_loc: z.string(),
      player_loc: z.string().optional(),
      duration: z.string().optional(),
      expiration_date: z.date().optional(),
      rating: z.number().optional(),
      view_count: z.number().optional(),
      publication_date: z.date().optional(),
      family_friendly: z.boolean().optional(),
      tag: z.string().optional(),
      category: z.string().optional(),
      restriction: z.object({
        relationship: z.literal('allow').optional(),
        value: z.string().optional(),
      }).optional(),
      gallery_loc: z.string().optional(),
      price: z.string().optional(),
      requires_subscription: z.boolean().optional(),
      uploader: z.string().optional(),
    })).optional(),
  }).optional(),
})

export type SitemapSchema = TypeOf<typeof schema>

export interface AsSitemapCollectionOptions<TEntry = Record<string, unknown>> {
  /**
   * Collection name. Must match the key in your collections object.
   * Required when using `filter` or `onUrl`.
   * @example
   * collections: {
   *   blog: defineCollection(asSitemapCollection({...}, { name: 'blog', filter: ... }))
   * }
   */
  name?: string
  /**
   * Runtime filter function to exclude entries from sitemap.
   * Receives the full content entry including all schema fields.
   * Requires `name` parameter to be set.
   * @example
   * { name: 'blog', filter: (entry) => !entry.draft && new Date(entry.date) <= new Date() }
   */
  filter?: (entry: PageCollectionItemBase & SitemapSchema & TEntry) => boolean
  /**
   * Transform the sitemap URL entry for each item in this collection.
   * Mutate `url` directly to change `loc`, `lastmod`, `priority`, etc.
   * The full content entry and collection name are provided for context.
   * Useful when the collection uses `prefix: ''` in its source config,
   * which strips the directory prefix from content paths.
   * Requires `name` parameter to be set.
   * @example
   * // Add a locale prefix
   * { name: 'content_zh', onUrl: (url) => { url.loc = `/zh${url.loc}` } }
   * @example
   * // Use content entry fields to set priority
   * { name: 'blog', onUrl: (url, entry) => { url.priority = entry.featured ? 1.0 : 0.5 } }
   */
  onUrl?: (
    url: { loc: string, lastmod?: string | Date, changefreq?: string, priority?: number, images?: { loc: string }[], videos?: { content_loc: string }[], [key: string]: unknown },
    entry: PageCollectionItemBase & SitemapSchema & TEntry,
    collection: string,
  ) => void
}

export function asSitemapCollection<T>(collection: Collection<T>, options?: AsSitemapCollectionOptions<T>): Collection<T> {
  if (collection.type === 'page') {
    // @ts-expect-error untyped
    collection.schema = collection.schema ? schema.extend(collection.schema.shape) : schema

    if (options?.filter || options?.onUrl) {
      if (!options.name)
        throw new Error('[sitemap] `name` is required when using `filter` or `onUrl` in asSitemapCollection()')
      if (options.filter)
        collectionFilters.set(options.name, options.filter)
      if (options.onUrl)
        collectionOnUrlFns.set(options.name, options.onUrl)
    }
  }

  return collection
}
